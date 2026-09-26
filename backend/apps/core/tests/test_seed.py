from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from apps.notifications.models import Notification
from apps.posts.models import Bookmark, Comment, Hashtag, Post, PostLike
from apps.users.models import Follow

User = get_user_model()


class SeedCommandTests(TestCase):
    def run_seed(self):
        out = StringIO()
        call_command("seed", "--no-images", stdout=out)
        return out.getvalue()

    def test_seed_creates_demo_data_and_is_idempotent(self):
        output = self.run_seed()
        self.assertIn("Done.", output)
        counts = {
            "users": User.objects.count(),
            "follows": Follow.objects.count(),
            "posts": Post.objects.count(),
            "likes": PostLike.objects.count(),
            "comments": Comment.objects.count(),
            "bookmarks": Bookmark.objects.count(),
            "hashtags": Hashtag.objects.count(),
            "notifications": Notification.objects.count(),
        }
        self.assertEqual(counts["users"], 8)
        for name, value in counts.items():
            self.assertGreater(value, 0, name)
        self.assertTrue(
            Post.objects.filter(repost_of__isnull=False, content="").exists()
        )  # reposts
        self.assertTrue(
            Post.objects.filter(repost_of__isnull=False).exclude(content="").exists()
        )  # quotes
        self.assertTrue(User.objects.get(username="ada").check_password("network123"))

        self.run_seed()
        self.assertEqual(
            counts,
            {
                "users": User.objects.count(),
                "follows": Follow.objects.count(),
                "posts": Post.objects.count(),
                "likes": PostLike.objects.count(),
                "comments": Comment.objects.count(),
                "bookmarks": Bookmark.objects.count(),
                "hashtags": Hashtag.objects.count(),
                "notifications": Notification.objects.count(),
            },
        )
