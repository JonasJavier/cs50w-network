from datetime import timedelta

from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, OuterRef, Prefetch, Q, Subquery
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination, TimelineCursorPagination
from apps.core.permissions import IsAuthorOrReadOnly
from apps.notifications.models import Notification
from apps.users.models import Follow, User
from apps.users.serializers import UserCardSerializer
from apps.users.views import annotate_profile

from .models import NO_IMAGE, Bookmark, Comment, Hashtag, Post, PostLike
from .serializers import (
    CommentSerializer,
    HashtagSerializer,
    PostSerializer,
    ToggleBookmarkSerializer,
    ToggleLikeSerializer,
    ToggleRepostSerializer,
)
from .services import notify_mentions, resolve_original, sync_hashtags

TRENDING_CACHE_KEY = "hashtags:trending"
TRENDING_CACHE_TTL = 60 * 5


def _count_subquery(model, fk: str):
    """COUNT(*) of ``model`` rows pointing at the outer post, without join explosion."""
    return Coalesce(
        Subquery(
            model.objects.filter(**{fk: OuterRef("pk")})
            .order_by()
            .values(fk)
            .annotate(c=Count("pk"))
            .values("c")[:1]
        ),
        0,
    )


def base_posts(user):
    """Posts with author, counters and per-user state (no repost prefetch)."""
    return (
        Post.objects.select_related("author")
        .prefetch_related("hashtags")
        .annotate(
            likes_count=_count_subquery(PostLike, "post"),
            comments_count=_count_subquery(Comment, "post"),
            reposts_count=_count_subquery(Post, "repost_of"),
            is_liked=Exists(PostLike.objects.filter(post=OuterRef("pk"), user=user)),
            is_reposted=Exists(
                Post.objects.filter(NO_IMAGE, repost_of=OuterRef("pk"), author=user, content="")
            ),
            is_bookmarked=Exists(Bookmark.objects.filter(post=OuterRef("pk"), user=user)),
        )
    )


def annotated_posts(user):
    """``base_posts`` plus the embedded original for reposts/quotes, also annotated."""
    return base_posts(user).prefetch_related(Prefetch("repost_of", queryset=base_posts(user)))


def annotated_comments(user):
    """Comment queryset with author, like counts, and like state attached."""
    return Comment.objects.select_related("author").annotate(
        likes_count=Count("likes", distinct=True),
        is_liked=Exists(Comment.likes.through.objects.filter(comment=OuterRef("pk"), user=user)),
    )


@extend_schema(tags=["posts"])
class PostViewSet(viewsets.ModelViewSet):
    """Timeline feed plus full CRUD on posts, likes, reposts and bookmarks."""

    serializer_class = PostSerializer
    pagination_class = TimelineCursorPagination
    http_method_names = ["get", "post", "patch", "delete", "options"]
    queryset = Post.objects.none()

    def get_permissions(self):
        if self.action in {"update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsAuthorOrReadOnly()]
        return super().get_permissions()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Post.objects.none()
        user = self.request.user
        queryset = annotated_posts(user)
        params = self.request.query_params

        if params.get("feed") == "following":
            followed = Follow.objects.filter(follower=user).values("following_id")
            queryset = queryset.filter(Q(author_id__in=followed) | Q(author=user))
        if author := params.get("author"):
            queryset = queryset.filter(author__username__iexact=author)
        if liked_by := params.get("liked_by"):
            queryset = queryset.filter(postlike__user__username__iexact=liked_by)
        if params.get("bookmarked") in {"1", "true"}:
            queryset = queryset.filter(bookmarks__user=user)
        if params.get("media") in {"1", "true"}:
            queryset = queryset.filter(image__isnull=False).exclude(image="")
        if hashtag := params.get("hashtag"):
            queryset = queryset.filter(hashtags__name=hashtag.lstrip("#").lower())
        if search := params.get("search", "").strip():
            if search.startswith("#") and len(search) > 1:
                queryset = queryset.filter(hashtags__name=search[1:].lower())
            else:
                queryset = queryset.filter(content__icontains=search)
        return queryset.distinct()

    @extend_schema(
        parameters=[
            OpenApiParameter("feed", str, description="`following` → people you follow (+ you)"),
            OpenApiParameter("author", str, description="Username"),
            OpenApiParameter("liked_by", str, description="Posts liked by this username"),
            OpenApiParameter("bookmarked", bool, description="Your saved posts"),
            OpenApiParameter("media", bool, description="Only posts with an image"),
            OpenApiParameter("hashtag", str, description="Posts tagged with this hashtag"),
            OpenApiParameter("search", str, description="Full text (or `#tag`)"),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        with transaction.atomic():
            post = serializer.save(author=self.request.user)
            sync_hashtags(post)
            original = post.repost_of
            if original is not None and original.author_id != self.request.user.id:
                Notification.objects.get_or_create(
                    recipient=original.author,
                    actor=self.request.user,
                    verb=Notification.Verb.QUOTE,
                    post=post,
                )
            notify_mentions(
                self.request.user,
                post.content,
                post,
                exclude_ids=[original.author_id] if original else (),
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            post = serializer.save()
            sync_hashtags(post)

    def retrieve(self, request, *args, **kwargs):
        # re-fetch through the annotated queryset so counters are present
        return super().retrieve(request, *args, **kwargs)

    # ----- likes -----------------------------------------------------------

    @extend_schema(request=None, responses={200: ToggleLikeSerializer})
    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        post = self.get_object()
        like, created = PostLike.objects.get_or_create(user=request.user, post=post)
        if created:
            if post.author_id != request.user.id:
                Notification.objects.get_or_create(
                    recipient=post.author,
                    actor=request.user,
                    verb=Notification.Verb.LIKE_POST,
                    post=post,
                )
            liked = True
        else:
            like.delete()
            Notification.objects.filter(
                recipient=post.author,
                actor=request.user,
                verb=Notification.Verb.LIKE_POST,
                post=post,
            ).delete()
            liked = False
        return Response({"is_liked": liked, "likes_count": post.likes.count()})

    @extend_schema(responses={200: UserCardSerializer(many=True)})
    @action(detail=True, methods=["get"], pagination_class=StandardPagination)
    def likes(self, request, pk=None):
        """People who liked this post, most recent first."""
        post = self.get_object()
        queryset = annotate_profile(
            User.objects.filter(postlike__post=post), request.user
        ).order_by("-postlike__created_at")
        page = self.paginate_queryset(queryset)
        serializer = UserCardSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(serializer.data)

    # ----- reposts ---------------------------------------------------------

    @extend_schema(request=None, responses={200: ToggleRepostSerializer})
    @action(detail=True, methods=["post"])
    def repost(self, request, pk=None):
        """Toggle a plain repost of this post (quotes are created with POST /posts/)."""
        original = resolve_original(self.get_object())
        existing = Post.objects.filter(
            NO_IMAGE, author=request.user, repost_of=original, content=""
        )
        if existing.exists():
            existing.delete()
            Notification.objects.filter(
                recipient=original.author,
                actor=request.user,
                verb=Notification.Verb.REPOST,
                post=original,
            ).delete()
            reposted = False
        else:
            try:
                with transaction.atomic():
                    Post.objects.create(
                        author=request.user, repost_of=original, content="", image=None
                    )
            except IntegrityError:  # raced with a concurrent request — already reposted
                pass
            if original.author_id != request.user.id:
                Notification.objects.get_or_create(
                    recipient=original.author,
                    actor=request.user,
                    verb=Notification.Verb.REPOST,
                    post=original,
                )
            reposted = True
        return Response({"is_reposted": reposted, "reposts_count": original.reposts.count()})

    # ----- bookmarks -------------------------------------------------------

    @extend_schema(request=None, responses={200: ToggleBookmarkSerializer})
    @action(detail=True, methods=["post"])
    def bookmark(self, request, pk=None):
        post = self.get_object()
        bookmark, created = Bookmark.objects.get_or_create(user=request.user, post=post)
        if not created:
            bookmark.delete()
        return Response({"is_bookmarked": created})


@extend_schema(tags=["comments"])
class PostCommentsView(generics.ListCreateAPIView):
    """List top-level comments (replies nested) or add a comment to a post."""

    serializer_class = CommentSerializer
    pagination_class = StandardPagination
    queryset = Comment.objects.none()

    def get_post(self):
        return get_object_or_404(Post, pk=self.kwargs["post_id"])

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["post_id"] = self.kwargs.get("post_id")
        return context

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Comment.objects.none()
        replies = Prefetch("replies", queryset=annotated_comments(self.request.user))
        return (
            annotated_comments(self.request.user)
            .filter(post_id=self.kwargs["post_id"], parent__isnull=True)
            .prefetch_related(replies)
            .order_by("created_at", "id")
        )

    def perform_create(self, serializer):
        post = self.get_post()
        actor = self.request.user
        with transaction.atomic():
            comment = serializer.save(author=actor, post=post)
            notified = []
            if comment.parent and comment.parent.author_id != actor.id:
                Notification.objects.get_or_create(
                    recipient=comment.parent.author,
                    actor=actor,
                    verb=Notification.Verb.REPLY,
                    post=post,
                    comment=comment,
                )
                notified.append(comment.parent.author_id)
            elif not comment.parent and post.author_id != actor.id:
                Notification.objects.get_or_create(
                    recipient=post.author,
                    actor=actor,
                    verb=Notification.Verb.COMMENT,
                    post=post,
                    comment=comment,
                )
                notified.append(post.author_id)
            notify_mentions(actor, comment.content, post, comment=comment, exclude_ids=notified)


@extend_schema(tags=["comments"])
class CommentViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Edit or delete your own comments; like/unlike any comment."""

    serializer_class = CommentSerializer
    http_method_names = ["get", "patch", "post", "delete", "options"]
    queryset = Comment.objects.none()

    def get_permissions(self):
        if self.action in {"update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsAuthorOrReadOnly()]
        return super().get_permissions()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Comment.objects.none()
        replies = Prefetch("replies", queryset=annotated_comments(self.request.user))
        return annotated_comments(self.request.user).prefetch_related(replies)

    @extend_schema(request=None, responses={200: ToggleLikeSerializer})
    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        comment = self.get_object()
        if comment.likes.filter(pk=request.user.pk).exists():
            comment.likes.remove(request.user)
            Notification.objects.filter(
                recipient=comment.author,
                actor=request.user,
                verb=Notification.Verb.LIKE_COMMENT,
                comment=comment,
            ).delete()
            liked = False
        else:
            comment.likes.add(request.user)
            liked = True
            if comment.author_id != request.user.id:
                Notification.objects.get_or_create(
                    recipient=comment.author,
                    actor=request.user,
                    verb=Notification.Verb.LIKE_COMMENT,
                    post=comment.post,
                    comment=comment,
                )
        return Response({"is_liked": liked, "likes_count": comment.likes.count()})


@extend_schema(tags=["posts"], responses={200: HashtagSerializer(many=True)})
class TrendingHashtagsView(APIView):
    """Most-used hashtags over the last 7 days (cached for 5 minutes)."""

    def get(self, request):
        data = cache.get(TRENDING_CACHE_KEY)
        if data is None:
            since = timezone.now() - timedelta(days=7)
            tags = (
                Hashtag.objects.filter(posts__created_at__gte=since)
                .annotate(posts_count=Count("posts", distinct=True))
                .order_by("-posts_count", "name")[:8]
            )
            data = HashtagSerializer(tags, many=True).data
            cache.set(TRENDING_CACHE_KEY, data, TRENDING_CACHE_TTL)
        return Response(data)
