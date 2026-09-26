from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import F, Q

USERNAME_VALIDATOR = RegexValidator(
    r"^[A-Za-z0-9_.]{3,30}$",
    "Username must be 3–30 characters: letters, numbers, dots and underscores only.",
)

# Route segments and names that would collide with the app or the API.
RESERVED_USERNAMES = frozenset(
    {
        "me",
        "admin",
        "api",
        "auth",
        "login",
        "logout",
        "register",
        "settings",
        "search",
        "explore",
        "notifications",
        "bookmarks",
        "post",
        "posts",
        "profile",
        "users",
        "network",
        "support",
        "help",
        "root",
        "system",
    }
)


class User(AbstractUser):
    """A member of the network, with a professional profile."""

    email = models.EmailField("email address", unique=True)
    headline = models.CharField(max_length=120, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    cover = models.ImageField(upload_to="covers/", blank=True, null=True)

    class Meta(AbstractUser.Meta):
        indexes = [models.Index(fields=["-date_joined"])]

    def __str__(self):
        return self.username

    @property
    def name(self) -> str:
        return self.get_full_name() or self.username


class Follow(models.Model):
    """A directed follow relationship between two users."""

    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following_relations")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="follower_relations")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["follower", "following"], name="unique_follow"),
            models.CheckConstraint(condition=~Q(follower=F("following")), name="no_self_follow"),
        ]
        indexes = [
            models.Index(fields=["follower", "-created_at"]),
            models.Index(fields=["following", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.follower} → {self.following}"
