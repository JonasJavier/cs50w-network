from django.conf import settings
from django.db import models
from django.db.models import Q

# An ImageField without a file is stored as "" (assigned through the model) or NULL (raw SQL).
NO_IMAGE = Q(image="") | Q(image__isnull=True)


class Hashtag(models.Model):
    """A topic tag extracted from post content (stored lower-case, without '#')."""

    name = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"#{self.name}"


class Post(models.Model):
    """A feed post: text, optionally with an image, optionally reposting/quoting another post.

    * plain post   — content and/or image, ``repost_of`` is null
    * repost       — ``repost_of`` set, no content and no image (one per user & post)
    * quote        — ``repost_of`` set *and* own content/image
    """

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="posts"
    )
    content = models.TextField(max_length=2000, blank=True)
    image = models.ImageField(upload_to="posts/", blank=True, null=True)
    repost_of = models.ForeignKey(
        "self", on_delete=models.CASCADE, blank=True, null=True, related_name="reposts"
    )
    hashtags = models.ManyToManyField(Hashtag, related_name="posts", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="PostLike", related_name="liked_posts", blank=True
    )

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["author", "-created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["author", "repost_of"],
                condition=Q(content="") & NO_IMAGE,
                name="unique_plain_repost",
            ),
        ]

    def __str__(self):
        return f"Post {self.pk} by {self.author}"

    @property
    def is_repost(self) -> bool:
        """True for a plain repost (no own content), False for quotes and originals."""
        return self.repost_of_id is not None and not self.content and not self.image


class PostLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "post"], name="unique_post_like")]
        indexes = [models.Index(fields=["post", "-created_at"])]

    def __str__(self):
        return f"{self.user} likes post {self.post_id}"


class Bookmark(models.Model):
    """A post saved by a user for later (private)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookmarks"
    )
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="bookmarks")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "post"], name="unique_bookmark")]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.user} saved post {self.post_id}"


class Comment(models.Model):
    """A comment on a post; replies reference their parent comment."""

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, related_name="replies", blank=True, null=True
    )
    content = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="liked_comments", blank=True
    )

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["post", "created_at"])]

    def __str__(self):
        return f"Comment {self.pk} by {self.author} on post {self.post_id}"
