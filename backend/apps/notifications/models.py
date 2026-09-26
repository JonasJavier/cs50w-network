from django.conf import settings
from django.db import models


class Notification(models.Model):
    """An activity notification: someone followed you, liked, commented, reposted…"""

    class Verb(models.TextChoices):
        FOLLOW = "follow", "followed you"
        LIKE_POST = "like_post", "liked your post"
        COMMENT = "comment", "commented on your post"
        REPLY = "reply", "replied to your comment"
        LIKE_COMMENT = "like_comment", "liked your comment"
        MENTION = "mention", "mentioned you"
        REPOST = "repost", "reposted your post"
        QUOTE = "quote", "quoted your post"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    verb = models.CharField(max_length=20, choices=Verb.choices)
    post = models.ForeignKey(
        "posts.Post", on_delete=models.CASCADE, blank=True, null=True, related_name="+"
    )
    comment = models.ForeignKey(
        "posts.Comment", on_delete=models.CASCADE, blank=True, null=True, related_name="+"
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["recipient", "is_read", "-created_at"])]

    def __str__(self):
        return f"{self.actor} {self.get_verb_display()} → {self.recipient}"
