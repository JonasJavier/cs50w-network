from rest_framework import serializers

from apps.core.images import process_image, validate_upload_size
from apps.users.serializers import UserMiniSerializer

from .models import NO_IMAGE, Comment, Post


class CommentSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(), required=False, allow_null=True, write_only=True
    )
    replies = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_edited = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "post",
            "author",
            "parent",
            "content",
            "created_at",
            "updated_at",
            "is_edited",
            "likes_count",
            "is_liked",
            "replies",
        ]
        read_only_fields = ["post", "created_at", "updated_at"]

    def validate_parent(self, parent):
        if parent is None:
            return parent
        if self.instance is not None:
            raise serializers.ValidationError("The parent of a comment cannot be changed.")
        if parent.parent_id is not None:
            raise serializers.ValidationError("Replies can only be one level deep.")
        post_id = self.context.get("post_id")
        if post_id is not None and parent.post_id != post_id:
            raise serializers.ValidationError("Parent comment belongs to another post.")
        return parent

    def validate_content(self, content):
        content = content.strip()
        if not content:
            raise serializers.ValidationError("Comment cannot be empty.")
        return content

    def get_replies(self, obj) -> list:
        if obj.parent_id is not None:
            return []
        return CommentSerializer(obj.replies.all(), many=True, context=self.context).data

    def get_likes_count(self, obj) -> int:
        annotated = getattr(obj, "likes_count", None)
        return annotated if annotated is not None else obj.likes.count()

    def get_is_liked(self, obj) -> bool:
        annotated = getattr(obj, "is_liked", None)
        if annotated is not None:
            return annotated
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(pk=request.user.pk).exists()

    def get_is_edited(self, obj) -> bool:
        return (obj.updated_at - obj.created_at).total_seconds() > 2


class PostPreviewSerializer(serializers.ModelSerializer):
    """A post without its own ``repost_of`` — used for the original embedded in a repost/quote."""

    author = UserMiniSerializer(read_only=True)
    image = serializers.ImageField(
        required=False, allow_null=True, validators=[validate_upload_size]
    )
    hashtags = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    reposts_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_reposted = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    is_edited = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "content",
            "image",
            "hashtags",
            "created_at",
            "updated_at",
            "is_edited",
            "likes_count",
            "comments_count",
            "reposts_count",
            "is_liked",
            "is_reposted",
            "is_bookmarked",
        ]
        read_only_fields = ["created_at", "updated_at"]
        # DRF would otherwise mark `content` required because it appears in the
        # condition of the `unique_plain_repost` constraint.
        extra_kwargs = {"content": {"required": False}}

    def get_hashtags(self, obj) -> list[str]:
        return [tag.name for tag in obj.hashtags.all()]

    def _annotated(self, obj, name, fallback):
        value = getattr(obj, name, None)
        return value if value is not None else fallback()

    def get_likes_count(self, obj) -> int:
        return self._annotated(obj, "likes_count", obj.likes.count)

    def get_comments_count(self, obj) -> int:
        return self._annotated(obj, "comments_count", obj.comments.count)

    def get_reposts_count(self, obj) -> int:
        return self._annotated(obj, "reposts_count", obj.reposts.count)

    def _request_user(self):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return request.user
        return None

    def get_is_liked(self, obj) -> bool:
        annotated = getattr(obj, "is_liked", None)
        if annotated is not None:
            return annotated
        user = self._request_user()
        return bool(user) and obj.likes.filter(pk=user.pk).exists()

    def get_is_reposted(self, obj) -> bool:
        annotated = getattr(obj, "is_reposted", None)
        if annotated is not None:
            return annotated
        user = self._request_user()
        return bool(user) and obj.reposts.filter(NO_IMAGE, author=user, content="").exists()

    def get_is_bookmarked(self, obj) -> bool:
        annotated = getattr(obj, "is_bookmarked", None)
        if annotated is not None:
            return annotated
        user = self._request_user()
        return bool(user) and obj.bookmarks.filter(user=user).exists()

    def get_is_edited(self, obj) -> bool:
        return (obj.updated_at - obj.created_at).total_seconds() > 2


class PostSerializer(PostPreviewSerializer):
    """Full post representation: adds the embedded original for reposts and quotes."""

    repost_of = PostPreviewSerializer(read_only=True)
    repost_of_id = serializers.PrimaryKeyRelatedField(
        source="repost_of",
        queryset=Post.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
        help_text=(
            "Quote this post (requires content or an image). "
            "Plain reposts use POST /posts/{id}/repost/."
        ),
    )
    is_repost = serializers.BooleanField(read_only=True)

    class Meta(PostPreviewSerializer.Meta):
        fields = PostPreviewSerializer.Meta.fields + ["repost_of", "repost_of_id", "is_repost"]

    def validate_image(self, file):
        return process_image(file, "post") if file else file

    def validate(self, attrs):
        content = (attrs.get("content") or "").strip()
        image = attrs.get("image", getattr(self.instance, "image", None))

        if self.instance is not None:
            # repost target is immutable once created
            attrs.pop("repost_of", None)
            if "content" not in attrs:
                content = self.instance.content
        else:
            original = attrs.get("repost_of")
            if original is not None:
                if original.is_repost and original.repost_of_id:
                    attrs["repost_of"] = original = original.repost_of
                if not content and not image:
                    raise serializers.ValidationError(
                        {"content": "Add a comment to quote this post, or use the repost action."}
                    )

        if not content and not image:
            raise serializers.ValidationError({"content": "A post needs text or an image."})
        if "content" in attrs or self.instance is None:
            attrs["content"] = content
        return attrs


class HashtagSerializer(serializers.Serializer):
    name = serializers.CharField()
    posts_count = serializers.IntegerField()


class ToggleLikeSerializer(serializers.Serializer):
    is_liked = serializers.BooleanField()
    likes_count = serializers.IntegerField()


class ToggleRepostSerializer(serializers.Serializer):
    is_reposted = serializers.BooleanField()
    reposts_count = serializers.IntegerField()


class ToggleBookmarkSerializer(serializers.Serializer):
    is_bookmarked = serializers.BooleanField()
