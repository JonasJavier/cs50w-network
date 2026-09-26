from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.core.images import process_image, validate_upload_size

from .models import RESERVED_USERNAMES, USERNAME_VALIDATOR, Follow, User


class UserMiniSerializer(serializers.ModelSerializer):
    """Compact user representation embedded in posts, comments, etc."""

    name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "name", "headline", "avatar"]
        read_only_fields = fields


class UserCardSerializer(UserMiniSerializer):
    """User representation for people lists — includes follow state."""

    is_following = serializers.SerializerMethodField()
    follows_you = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()

    class Meta(UserMiniSerializer.Meta):
        fields = UserMiniSerializer.Meta.fields + ["is_following", "follows_you", "followers_count"]
        read_only_fields = fields

    def _request_user(self):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return request.user
        return None

    def get_is_following(self, obj) -> bool:
        annotated = getattr(obj, "is_following", None)
        if annotated is not None:
            return annotated
        user = self._request_user()
        return bool(user) and Follow.objects.filter(follower=user, following=obj).exists()

    def get_follows_you(self, obj) -> bool:
        annotated = getattr(obj, "follows_you", None)
        if annotated is not None:
            return annotated
        user = self._request_user()
        return bool(user) and Follow.objects.filter(follower=obj, following=user).exists()

    def get_followers_count(self, obj) -> int:
        annotated = getattr(obj, "followers_count", None)
        return annotated if annotated is not None else obj.follower_relations.count()


class UserDetailSerializer(UserCardSerializer):
    """Full profile representation."""

    following_count = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()

    class Meta(UserCardSerializer.Meta):
        fields = UserCardSerializer.Meta.fields + [
            "first_name",
            "last_name",
            "bio",
            "location",
            "website",
            "cover",
            "following_count",
            "posts_count",
            "date_joined",
        ]
        read_only_fields = fields

    def get_following_count(self, obj) -> int:
        annotated = getattr(obj, "following_count", None)
        return annotated if annotated is not None else obj.following_relations.count()

    def get_posts_count(self, obj) -> int:
        annotated = getattr(obj, "posts_count", None)
        return annotated if annotated is not None else obj.posts.count()


class MeSerializer(UserDetailSerializer):
    """The authenticated user's own profile — adds private fields."""

    class Meta(UserDetailSerializer.Meta):
        fields = UserDetailSerializer.Meta.fields + ["email", "last_login"]
        read_only_fields = fields


def normalise_website(value: str) -> str:
    value = (value or "").strip()
    if value and not value.lower().startswith(("http://", "https://")):
        value = f"https://{value}"
    return value


class UserUpdateSerializer(serializers.ModelSerializer):
    """Fields a user may edit on their own profile."""

    avatar = serializers.ImageField(
        required=False, allow_null=True, validators=[validate_upload_size]
    )
    cover = serializers.ImageField(
        required=False, allow_null=True, validators=[validate_upload_size]
    )
    remove_avatar = serializers.BooleanField(required=False, write_only=True, default=False)
    remove_cover = serializers.BooleanField(required=False, write_only=True, default=False)
    website = serializers.CharField(required=False, allow_blank=True, max_length=200)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "headline",
            "bio",
            "location",
            "website",
            "avatar",
            "cover",
            "remove_avatar",
            "remove_cover",
        ]

    def validate_website(self, value):
        value = normalise_website(value)
        if value:
            serializers.URLField().run_validation(value)
        return value

    def validate_avatar(self, file):
        return process_image(file, "avatar") if file else file

    def validate_cover(self, file):
        return process_image(file, "cover") if file else file

    def validate(self, attrs):
        for field in ("first_name", "last_name", "headline", "location", "bio"):
            if field in attrs and attrs[field] is not None:
                attrs[field] = attrs[field].strip()
        if attrs.pop("remove_avatar", False):
            attrs["avatar"] = None
        if attrs.pop("remove_cover", False):
            attrs["cover"] = None
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=30, validators=[USERNAME_VALIDATOR])
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name"]
        extra_kwargs = {
            "first_name": {"required": False, "allow_blank": True},
            "last_name": {"required": False, "allow_blank": True},
        }

    def validate_username(self, value):
        if value.lower() in RESERVED_USERNAMES:
            raise serializers.ValidationError("This username is reserved.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        # Run Django's validators with the user attributes so the similarity check works.
        user = User(
            username=attrs.get("username", ""),
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            password_validation.validate_password(attrs["password"], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    """Login with username *or* e-mail; also returns the profile."""

    default_error_messages = {
        "no_active_account": "Invalid credentials. Check your username/e-mail and password."
    }

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = MeSerializer(self.user, context=self.context).data
        return data


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password must differ from the current one."}
            )
        try:
            password_validation.validate_password(
                attrs["new_password"], self.context["request"].user
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc
        return attrs


class AccountDeleteSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Password is incorrect.")
        return value


class TokenPairSerializer(serializers.Serializer):
    """Response shape documentation for endpoints that issue tokens."""

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = MeSerializer()
