import io

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import Notification
from apps.users.models import Follow

from .models import Bookmark, Comment, Hashtag, Post, PostLike

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username, email=f"{username}@test.dev", password="S3cure-pass!"
    )


def image_upload(name="photo.png", size=(2400, 1200)):
    buffer = io.BytesIO()
    Image.new("RGB", size, (30, 90, 200)).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class PostTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")
        self.other = make_user("trinity")
        self.client.force_authenticate(self.user)

    def test_create_post(self):
        response = self.client.post("/api/v1/posts/", {"content": "Hello network!"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["author"]["username"], "neo")
        self.assertEqual(response.data["likes_count"], 0)
        self.assertEqual(response.data["reposts_count"], 0)
        self.assertFalse(response.data["is_liked"])
        self.assertFalse(response.data["is_bookmarked"])
        self.assertFalse(response.data["is_repost"])
        self.assertIsNone(response.data["repost_of"])

    def test_empty_post_rejected(self):
        response = self.client.post("/api/v1/posts/", {"content": "   "})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_too_long_post_rejected(self):
        response = self.client.post("/api/v1/posts/", {"content": "x" * 2001})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_image_post_is_processed(self):
        response = self.client.post(
            "/api/v1/posts/", {"content": "", "image": image_upload()}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["image"].endswith(".webp"))
        post = Post.objects.get()
        with Image.open(post.image.path) as image:
            self.assertEqual(image.size, (1600, 800))
        name, storage = post.image.name, post.image.storage
        self.client.delete(f"/api/v1/posts/{post.id}/")
        self.assertFalse(storage.exists(name))  # file cleaned up with the post

    def test_feed_returns_all_posts_newest_first(self):
        Post.objects.create(author=self.user, content="mine")
        Post.objects.create(author=self.other, content="theirs")
        response = self.client.get("/api/v1/posts/")
        contents = [p["content"] for p in response.data["results"]]
        self.assertEqual(contents, ["theirs", "mine"])

    def test_feed_is_cursor_paginated(self):
        for i in range(12):
            Post.objects.create(author=self.user, content=f"post {i}")
        response = self.client.get("/api/v1/posts/")
        self.assertEqual(len(response.data["results"]), 10)
        self.assertIsNotNone(response.data["next"])
        second = self.client.get(response.data["next"])
        self.assertEqual(len(second.data["results"]), 2)
        self.assertIsNone(second.data["next"])

    def test_following_feed_includes_followed_and_own_posts(self):
        Post.objects.create(author=self.user, content="mine")
        Post.objects.create(author=self.other, content="theirs")
        stranger = make_user("stranger")
        Post.objects.create(author=stranger, content="noise")

        response = self.client.get("/api/v1/posts/", {"feed": "following"})
        self.assertEqual([p["content"] for p in response.data["results"]], ["mine"])

        Follow.objects.create(follower=self.user, following=self.other)
        response = self.client.get("/api/v1/posts/", {"feed": "following"})
        contents = [p["content"] for p in response.data["results"]]
        self.assertEqual(contents, ["theirs", "mine"])

    def test_author_filter(self):
        Post.objects.create(author=self.user, content="mine")
        Post.objects.create(author=self.other, content="theirs")
        response = self.client.get("/api/v1/posts/", {"author": "Trinity"})
        contents = [p["content"] for p in response.data["results"]]
        self.assertEqual(contents, ["theirs"])

    def test_media_filter(self):
        Post.objects.create(author=self.user, content="text only")
        self.client.post("/api/v1/posts/", {"image": image_upload()}, format="multipart")
        response = self.client.get("/api/v1/posts/", {"author": "neo", "media": "1"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNotNone(response.data["results"][0]["image"])

    def test_search_filter(self):
        Post.objects.create(author=self.user, content="Django is great")
        Post.objects.create(author=self.user, content="React too")
        response = self.client.get("/api/v1/posts/", {"search": "django"})
        self.assertEqual([p["content"] for p in response.data["results"]], ["Django is great"])

    def test_only_author_can_edit(self):
        post = Post.objects.create(author=self.other, content="original")
        response = self.client.patch(f"/api/v1/posts/{post.id}/", {"content": "hacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_author_can_edit_and_delete(self):
        post = Post.objects.create(author=self.user, content="original")
        response = self.client.patch(f"/api/v1/posts/{post.id}/", {"content": "edited"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content"], "edited")

        response = self.client.delete(f"/api/v1/posts/{post.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Post.objects.filter(id=post.id).exists())

    def test_like_toggles_and_lists_likers(self):
        post = Post.objects.create(author=self.other, content="like me")
        response = self.client.post(f"/api/v1/posts/{post.id}/like/")
        self.assertTrue(response.data["is_liked"])
        self.assertEqual(response.data["likes_count"], 1)

        likers = self.client.get(f"/api/v1/posts/{post.id}/likes/")
        self.assertEqual(likers.data["count"], 1)
        self.assertEqual(likers.data["results"][0]["username"], "neo")

        response = self.client.post(f"/api/v1/posts/{post.id}/like/")
        self.assertFalse(response.data["is_liked"])
        self.assertEqual(response.data["likes_count"], 0)

    def test_liked_by_filter(self):
        liked = Post.objects.create(author=self.other, content="liked")
        Post.objects.create(author=self.other, content="not liked")
        PostLike.objects.create(user=self.user, post=liked)
        response = self.client.get("/api/v1/posts/", {"liked_by": "neo"})
        self.assertEqual([p["content"] for p in response.data["results"]], ["liked"])

    def test_bookmark_toggle_and_filter(self):
        post = Post.objects.create(author=self.other, content="save me")
        response = self.client.post(f"/api/v1/posts/{post.id}/bookmark/")
        self.assertTrue(response.data["is_bookmarked"])
        self.assertTrue(Bookmark.objects.filter(user=self.user, post=post).exists())

        saved = self.client.get("/api/v1/posts/", {"bookmarked": "1"})
        self.assertEqual([p["id"] for p in saved.data["results"]], [post.id])
        self.assertTrue(saved.data["results"][0]["is_bookmarked"])

        response = self.client.post(f"/api/v1/posts/{post.id}/bookmark/")
        self.assertFalse(response.data["is_bookmarked"])
        self.assertEqual(self.client.get("/api/v1/posts/", {"bookmarked": "1"}).data["results"], [])


class HashtagTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")
        self.client.force_authenticate(self.user)
        cache.clear()

    def test_hashtags_are_extracted_and_searchable(self):
        response = self.client.post("/api/v1/posts/", {"content": "Loving #Django and #react"})
        self.assertEqual(response.data["hashtags"], ["django", "react"])
        self.assertEqual(Hashtag.objects.count(), 2)

        Post.objects.create(author=self.user, content="unrelated")
        by_param = self.client.get("/api/v1/posts/", {"hashtag": "django"})
        self.assertEqual(len(by_param.data["results"]), 1)
        by_search = self.client.get("/api/v1/posts/", {"search": "#React"})
        self.assertEqual(len(by_search.data["results"]), 1)

    def test_editing_resyncs_hashtags(self):
        post_id = self.client.post("/api/v1/posts/", {"content": "#old tag"}).data["id"]
        response = self.client.patch(f"/api/v1/posts/{post_id}/", {"content": "#new tag"})
        self.assertEqual(response.data["hashtags"], ["new"])

    def test_trending(self):
        self.client.post("/api/v1/posts/", {"content": "#python rocks"})
        self.client.post("/api/v1/posts/", {"content": "#python and #rust"})
        response = self.client.get("/api/v1/hashtags/trending/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0], {"name": "python", "posts_count": 2})
        self.assertEqual(response.data[1]["name"], "rust")


class RepostTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")
        self.other = make_user("trinity")
        self.original = Post.objects.create(author=self.other, content="original")
        self.client.force_authenticate(self.user)

    def test_repost_toggle(self):
        response = self.client.post(f"/api/v1/posts/{self.original.id}/repost/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_reposted"])
        self.assertEqual(response.data["reposts_count"], 1)
        repost = Post.objects.get(author=self.user)
        self.assertEqual(repost.repost_of, self.original)
        self.assertTrue(repost.is_repost)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.other, verb=Notification.Verb.REPOST
            ).exists()
        )

        # reposting twice does not duplicate; toggling removes it
        self.client.post(f"/api/v1/posts/{self.original.id}/repost/")
        self.assertEqual(Post.objects.filter(author=self.user).count(), 0)
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.other, verb=Notification.Verb.REPOST
            ).exists()
        )

    def test_repost_appears_in_feed_with_original_embedded(self):
        self.client.post(f"/api/v1/posts/{self.original.id}/repost/")
        feed = self.client.get("/api/v1/posts/")
        first = feed.data["results"][0]
        self.assertTrue(first["is_repost"])
        self.assertEqual(first["author"]["username"], "neo")
        self.assertEqual(first["repost_of"]["id"], self.original.id)
        self.assertEqual(first["repost_of"]["author"]["username"], "trinity")
        original_row = feed.data["results"][1]
        self.assertTrue(original_row["is_reposted"])
        self.assertEqual(original_row["reposts_count"], 1)

    def test_reposting_a_repost_targets_the_original(self):
        self.client.post(f"/api/v1/posts/{self.original.id}/repost/")
        repost = Post.objects.get(author=self.user)
        third = make_user("morpheus")
        self.client.force_authenticate(third)
        self.client.post(f"/api/v1/posts/{repost.id}/repost/")
        self.assertEqual(Post.objects.get(author=third).repost_of, self.original)

    def test_quote_requires_content(self):
        response = self.client.post("/api/v1/posts/", {"repost_of_id": self.original.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_quote_post(self):
        response = self.client.post(
            "/api/v1/posts/", {"repost_of_id": self.original.id, "content": "So true"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["is_repost"])
        self.assertEqual(response.data["repost_of"]["content"], "original")
        self.assertTrue(
            Notification.objects.filter(recipient=self.other, verb=Notification.Verb.QUOTE).exists()
        )

    def test_deleting_original_removes_reposts(self):
        self.client.post(f"/api/v1/posts/{self.original.id}/repost/")
        self.original.delete()
        self.assertEqual(Post.objects.count(), 0)


class MentionTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")
        self.other = make_user("trinity")
        self.client.force_authenticate(self.user)

    def test_mention_in_post_notifies_user(self):
        response = self.client.post("/api/v1/posts/", {"content": "Hey @Trinity look at this"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        notification = Notification.objects.get(recipient=self.other)
        self.assertEqual(notification.verb, Notification.Verb.MENTION)
        self.assertEqual(notification.post_id, response.data["id"])

    def test_self_mention_and_unknown_users_are_ignored(self):
        self.client.post("/api/v1/posts/", {"content": "@neo and @nobody"})
        self.assertEqual(Notification.objects.count(), 0)

    def test_mention_in_comment_notifies_but_not_twice(self):
        post = Post.objects.create(author=self.other, content="post")
        self.client.post(f"/api/v1/posts/{post.id}/comments/", {"content": "nice one @trinity"})
        # the post author gets *one* notification (comment), not comment + mention
        self.assertEqual(Notification.objects.filter(recipient=self.other).count(), 1)
        self.assertEqual(Notification.objects.get().verb, Notification.Verb.COMMENT)


class CommentTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")
        self.other = make_user("trinity")
        self.post = Post.objects.create(author=self.other, content="post")
        self.client.force_authenticate(self.user)

    def test_add_and_list_comments(self):
        response = self.client.post(f"/api/v1/posts/{self.post.id}/comments/", {"content": "Nice!"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["is_edited"])

        response = self.client.get(f"/api/v1/posts/{self.post.id}/comments/")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["content"], "Nice!")

    def test_comment_on_unknown_post_is_404(self):
        response = self.client.post("/api/v1/posts/999/comments/", {"content": "?"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_replies_nest_under_parent(self):
        parent = Comment.objects.create(post=self.post, author=self.other, content="parent")
        response = self.client.post(
            f"/api/v1/posts/{self.post.id}/comments/", {"content": "reply", "parent": parent.id}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        listing = self.client.get(f"/api/v1/posts/{self.post.id}/comments/")
        self.assertEqual(listing.data["count"], 1)  # only top-level paginated
        self.assertEqual(listing.data["results"][0]["replies"][0]["content"], "reply")

    def test_reply_depth_limited_to_one(self):
        parent = Comment.objects.create(post=self.post, author=self.other, content="parent")
        reply = Comment.objects.create(
            post=self.post, author=self.other, content="r", parent=parent
        )
        response = self.client.post(
            f"/api/v1/posts/{self.post.id}/comments/", {"content": "re-reply", "parent": reply.id}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_parent_must_belong_to_same_post(self):
        other_post = Post.objects.create(author=self.other, content="other")
        parent = Comment.objects.create(post=other_post, author=self.other, content="parent")
        response = self.client.post(
            f"/api/v1/posts/{self.post.id}/comments/", {"content": "x", "parent": parent.id}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_comment_like_toggles_with_notification_cleanup(self):
        comment = Comment.objects.create(post=self.post, author=self.other, content="c")
        response = self.client.post(f"/api/v1/comments/{comment.id}/like/")
        self.assertTrue(response.data["is_liked"])
        self.assertEqual(
            Notification.objects.filter(verb=Notification.Verb.LIKE_COMMENT).count(), 1
        )
        response = self.client.post(f"/api/v1/comments/{comment.id}/like/")
        self.assertFalse(response.data["is_liked"])
        self.assertEqual(
            Notification.objects.filter(verb=Notification.Verb.LIKE_COMMENT).count(), 0
        )

    def test_only_author_edits_and_deletes_comment(self):
        comment = Comment.objects.create(post=self.post, author=self.other, content="c")
        self.assertEqual(
            self.client.delete(f"/api/v1/comments/{comment.id}/").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.patch(f"/api/v1/comments/{comment.id}/", {"content": "x"}).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        mine = Comment.objects.create(post=self.post, author=self.user, content="mine")
        edited = self.client.patch(f"/api/v1/comments/{mine.id}/", {"content": "mine (edited)"})
        self.assertEqual(edited.status_code, status.HTTP_200_OK)
        self.assertEqual(edited.data["content"], "mine (edited)")
        response = self.client.delete(f"/api/v1/comments/{mine.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_comment_count_includes_replies(self):
        parent = Comment.objects.create(post=self.post, author=self.other, content="parent")
        Comment.objects.create(post=self.post, author=self.user, content="reply", parent=parent)
        response = self.client.get(f"/api/v1/posts/{self.post.id}/")
        self.assertEqual(response.data["comments_count"], 2)
