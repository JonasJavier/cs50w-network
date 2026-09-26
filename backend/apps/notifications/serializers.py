from rest_framework import serializers

from apps.users.serializers import UserMiniSerializer

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserMiniSerializer(read_only=True)
    post_preview = serializers.SerializerMethodField()
    comment_preview = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "actor",
            "verb",
            "post",
            "comment",
            "post_preview",
            "comment_preview",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields

    def get_post_preview(self, obj) -> str:
        post = obj.post
        if post is None:
            return ""
        if not post.content and post.repost_of_id and post.repost_of:
            return post.repost_of.content[:80]
        return post.content[:80] if post.content else ("📷 Photo" if post.image else "")

    def get_comment_preview(self, obj) -> str:
        return obj.comment.content[:80] if obj.comment else ""
