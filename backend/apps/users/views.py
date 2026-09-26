from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Exists, OuterRef
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import filters, generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.throttling import AuthRateThrottle
from apps.notifications.models import Notification

from .models import Follow
from .serializers import (
    AccountDeleteSerializer,
    LoginSerializer,
    MeSerializer,
    PasswordChangeSerializer,
    RegisterSerializer,
    TokenPairSerializer,
    UserCardSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
)

User = get_user_model()

SUGGESTIONS_CACHE_TTL = 60 * 5


def suggestions_cache_key(user_id: int) -> str:
    return f"user-suggestions:{user_id}"


def annotate_profile(queryset, user):
    """Attach counts and follow state used by the profile serializers."""
    return queryset.annotate(
        followers_count=Count("follower_relations", distinct=True),
        following_count=Count("following_relations", distinct=True),
        posts_count=Count("posts", distinct=True),
        is_following=Exists(Follow.objects.filter(follower=user, following=OuterRef("pk"))),
        follows_you=Exists(Follow.objects.filter(follower=OuterRef("pk"), following=user)),
    )


def revoke_all_tokens(user) -> None:
    """Blacklist every outstanding refresh token of ``user`` (all sessions)."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


def token_pair_for(user, request) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "user": MeSerializer(user, context={"request": request}).data,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


@extend_schema(tags=["auth"])
class RegisterView(generics.CreateAPIView):
    """Create an account and return JWT tokens so the client is logged in."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]
    serializer_class = RegisterSerializer

    @extend_schema(responses={201: TokenPairSerializer})
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(token_pair_for(user, request), status=status.HTTP_201_CREATED)


@extend_schema(tags=["auth"], responses={200: TokenPairSerializer})
class LoginView(TokenObtainPairView):
    """Obtain an access/refresh pair with username *or* e-mail + password."""

    serializer_class = LoginSerializer
    throttle_classes = [AuthRateThrottle]


@extend_schema(tags=["auth"])
class PasswordChangeView(APIView):
    """Change the password; every other session is signed out and fresh tokens returned."""

    throttle_classes = [AuthRateThrottle]
    serializer_class = PasswordChangeSerializer

    @extend_schema(request=PasswordChangeSerializer, responses={200: TokenPairSerializer})
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        with transaction.atomic():
            user.set_password(serializer.validated_data["new_password"])
            user.save(update_fields=["password"])
            revoke_all_tokens(user)
            payload = token_pair_for(user, request)
        return Response(payload)


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------


@extend_schema(tags=["users"])
class MeView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete the authenticated user's account."""

    http_method_names = ["get", "patch", "delete", "options"]

    def get_object(self):
        if getattr(self, "swagger_fake_view", False):
            return None
        return annotate_profile(
            User.objects.filter(pk=self.request.user.pk), self.request.user
        ).get()

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return UserUpdateSerializer
        if self.request.method == "DELETE":
            return AccountDeleteSerializer
        return MeSerializer

    @extend_schema(responses={200: MeSerializer})
    def partial_update(self, request, *args, **kwargs):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(self.get_object(), context={"request": request}).data)

    @extend_schema(request=AccountDeleteSerializer, responses={204: None})
    def destroy(self, request, *args, **kwargs):
        serializer = AccountDeleteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        with transaction.atomic():
            revoke_all_tokens(user)
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["users"])
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """Browse profiles, search people, follow/unfollow, and list relations."""

    lookup_field = "username"
    lookup_value_regex = r"[\w.@+-]+"
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "headline"]
    queryset = User.objects.none()  # replaced in get_queryset; keeps schema generation happy

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()
        return annotate_profile(User.objects.filter(is_active=True), self.request.user).order_by(
            "-followers_count", "username"
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return UserDetailSerializer
        return UserCardSerializer

    @extend_schema(
        parameters=[OpenApiParameter("search", str, description="Name, username or headline")]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(methods=["POST"], request=None, description="Follow this user.")
    @extend_schema(methods=["DELETE"], request=None, description="Unfollow this user.")
    @action(detail=True, methods=["post", "delete"])
    def follow(self, request, username=None):
        target = self.get_object()
        if target == request.user:
            return Response(
                {"detail": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST
            )

        if request.method == "POST":
            _, created = Follow.objects.get_or_create(follower=request.user, following=target)
            if created:
                Notification.objects.get_or_create(
                    recipient=target, actor=request.user, verb=Notification.Verb.FOLLOW
                )
            following = True
        else:
            Follow.objects.filter(follower=request.user, following=target).delete()
            Notification.objects.filter(
                recipient=target, actor=request.user, verb=Notification.Verb.FOLLOW
            ).delete()
            following = False

        cache.delete(suggestions_cache_key(request.user.id))
        followers_count = target.follower_relations.count()
        return Response({"is_following": following, "followers_count": followers_count})

    @action(detail=True, methods=["get"])
    def followers(self, request, username=None):
        target = self.get_object()
        queryset = annotate_profile(
            User.objects.filter(following_relations__following=target), request.user
        ).order_by("-following_relations__created_at")
        return self._paginated_cards(queryset)

    @action(detail=True, methods=["get"])
    def following(self, request, username=None):
        target = self.get_object()
        queryset = annotate_profile(
            User.objects.filter(follower_relations__follower=target), request.user
        ).order_by("-follower_relations__created_at")
        return self._paginated_cards(queryset)

    @extend_schema(responses={200: UserCardSerializer(many=True)})
    @action(detail=False, methods=["get"])
    def suggestions(self, request):
        """People to follow: most-followed members you don't follow yet."""
        cache_key = suggestions_cache_key(request.user.id)
        data = cache.get(cache_key)
        if data is None:
            followed = Follow.objects.filter(follower=request.user).values("following_id")
            queryset = (
                annotate_profile(User.objects.filter(is_active=True), request.user)
                .exclude(pk=request.user.pk)
                .exclude(pk__in=followed)
                .order_by("-followers_count", "-posts_count", "username")[:5]
            )
            data = UserCardSerializer(queryset, many=True, context={"request": request}).data
            cache.set(cache_key, data, SUGGESTIONS_CACHE_TTL)
        return Response(data)

    def _paginated_cards(self, queryset):
        page = self.paginate_queryset(queryset)
        serializer = UserCardSerializer(page, many=True, context={"request": self.request})
        return self.get_paginated_response(serializer.data)
