import io
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.throttling import AuthRateThrottle
from apps.notifications.models import Notification

from .models import Follow

User = get_user_model()
PASSWORD = "S3cure-pass!"


def make_user(username, **extra):
    return User.objects.create_user(
        username=username, email=f"{username}@test.dev", password=PASSWORD, **extra
    )


def image_upload(name="avatar.png", size=(900, 900)):
    buffer = io.BytesIO()
    Image.new("RGB", size, (10, 120, 200)).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class RegisterTests(APITestCase):
    url = "/api/v1/auth/register/"

    def test_register_returns_tokens_and_user(self):
        response = self.client.post(
            self.url, {"username": "neo", "email": "Neo@Test.dev", "password": PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "neo")
        self.assertEqual(response.data["user"]["email"], "neo@test.dev")  # normalised

    def test_register_rejects_weak_password(self):
        response = self.client.post(
            self.url, {"username": "neo", "email": "neo@test.dev", "password": "123"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_register_rejects_duplicate_email_case_insensitive(self):
        make_user("first")
        response = self.client.post(
            self.url, {"username": "second", "email": "FIRST@test.dev", "password": PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_rejects_duplicate_username_case_insensitive(self):
        make_user("neo")
        response = self.client.post(
            self.url, {"username": "NEO", "email": "other@test.dev", "password": PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_register_rejects_reserved_and_invalid_usernames(self):
        for bad in ["me", "admin", "ab", "with space", "bad@name", "x" * 31]:
            response = self.client.post(
                self.url, {"username": bad, "email": f"{bad[:3]}@test.dev", "password": PASSWORD}
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, bad)
            self.assertIn("username", response.data)


class LoginTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")

    def test_login_with_username(self):
        response = self.client.post(
            "/api/v1/auth/token/", {"username": "neo", "password": PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["username"], "neo")

    def test_login_with_email_case_insensitive(self):
        response = self.client.post(
            "/api/v1/auth/token/", {"username": "NEO@test.dev", "password": PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_wrong_password(self):
        response = self.client.post("/api/v1/auth/token/", {"username": "neo", "password": "nope"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_token_grants_access_to_me(self):
        token = self.client.post("/api/v1/auth/token/", {"username": "neo", "password": PASSWORD})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
        me = self.client.get("/api/v1/users/me/")
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["username"], "neo")
        self.assertEqual(me.data["email"], "neo@test.dev")

    def test_anonymous_cannot_access_feed(self):
        response = self.client.get("/api/v1/posts/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        token = self.client.post("/api/v1/auth/token/", {"username": "neo", "password": PASSWORD})
        refresh = token.data["refresh"]
        response = self.client.post("/api/v1/auth/logout/", {"refresh": refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.post("/api/v1/auth/token/refresh/", {"refresh": refresh})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch.object(AuthRateThrottle, "THROTTLE_RATES", {"auth": "3/min"})
    def test_login_is_rate_limited(self):
        cache.clear()
        for _ in range(3):
            self.client.post("/api/v1/auth/token/", {"username": "neo", "password": "nope"})
        response = self.client.post(
            "/api/v1/auth/token/", {"username": "neo", "password": PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        cache.clear()


class PasswordChangeTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")
        token = self.client.post("/api/v1/auth/token/", {"username": "neo", "password": PASSWORD})
        self.refresh = token.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")

    def test_change_password_rotates_sessions(self):
        response = self.client.post(
            "/api/v1/auth/password/change/",
            {"current_password": PASSWORD, "new_password": "An0ther-str0ng-pass"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("An0ther-str0ng-pass"))

        # the previous refresh token no longer works
        self.client.credentials()
        old = self.client.post("/api/v1/auth/token/refresh/", {"refresh": self.refresh})
        self.assertEqual(old.status_code, status.HTTP_401_UNAUTHORIZED)
        new = self.client.post("/api/v1/auth/token/refresh/", {"refresh": response.data["refresh"]})
        self.assertEqual(new.status_code, status.HTTP_200_OK)

    def test_wrong_current_password(self):
        response = self.client.post(
            "/api/v1/auth/password/change/",
            {"current_password": "nope", "new_password": "An0ther-str0ng-pass"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("current_password", response.data)

    def test_new_password_must_differ_and_be_strong(self):
        same = self.client.post(
            "/api/v1/auth/password/change/",
            {"current_password": PASSWORD, "new_password": PASSWORD},
        )
        self.assertEqual(same.status_code, status.HTTP_400_BAD_REQUEST)
        weak = self.client.post(
            "/api/v1/auth/password/change/",
            {"current_password": PASSWORD, "new_password": "12345678"},
        )
        self.assertEqual(weak.status_code, status.HTTP_400_BAD_REQUEST)


class AccountDeletionTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")
        self.client.force_authenticate(self.user)

    def test_delete_requires_correct_password(self):
        response = self.client.delete("/api/v1/users/me/", {"password": "wrong"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_delete_account(self):
        response = self.client.delete("/api/v1/users/me/", {"password": PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())


class ProfileTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")
        self.client.force_authenticate(self.user)

    def test_update_own_profile(self):
        response = self.client.patch(
            "/api/v1/users/me/", {"headline": "  Staff Engineer ", "bio": "Hello"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.headline, "Staff Engineer")
        self.assertEqual(response.data["headline"], "Staff Engineer")
        self.assertIn("followers_count", response.data)

    def test_website_gets_https_prefix(self):
        response = self.client.patch("/api/v1/users/me/", {"website": "example.com/me"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["website"], "https://example.com/me")

    def test_invalid_website_rejected(self):
        response = self.client.patch("/api/v1/users/me/", {"website": "not a url"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_avatar_upload_is_processed_and_removable(self):
        response = self.client.patch(
            "/api/v1/users/me/", {"avatar": image_upload()}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["avatar"].endswith(".webp"))
        self.user.refresh_from_db()
        with Image.open(self.user.avatar.path) as image:
            self.assertEqual(image.size, (512, 512))
        stored_name = self.user.avatar.name
        storage = self.user.avatar.storage

        response = self.client.patch("/api/v1/users/me/", {"remove_avatar": True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["avatar"])
        self.assertFalse(storage.exists(stored_name))  # file cleaned up

    def test_rejects_non_image_upload(self):
        fake = SimpleUploadedFile("x.png", b"nope", content_type="image/png")
        response = self.client.patch("/api/v1/users/me/", {"avatar": fake}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_profile_by_username(self):
        make_user("trinity", headline="Operator")
        response = self.client.get("/api/v1/users/trinity/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["headline"], "Operator")
        self.assertFalse(response.data["is_following"])
        self.assertFalse(response.data["follows_you"])
        self.assertNotIn("email", response.data)  # private

    def test_unknown_profile_is_404(self):
        response = self.client.get("/api/v1/users/ghost/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_search_users(self):
        make_user("trinity", headline="Operator")
        make_user("morpheus")
        response = self.client.get("/api/v1/users/", {"search": "trin"})
        usernames = [u["username"] for u in response.data["results"]]
        self.assertEqual(usernames, ["trinity"])

    def test_search_orders_by_popularity(self):
        popular = make_user("popular")
        make_user("pop_nobody")
        Follow.objects.create(follower=self.user, following=popular)
        response = self.client.get("/api/v1/users/", {"search": "pop"})
        usernames = [u["username"] for u in response.data["results"]]
        self.assertEqual(usernames[0], "popular")


class FollowTests(APITestCase):
    def setUp(self):
        self.user = make_user("neo")
        self.other = make_user("trinity")
        self.client.force_authenticate(self.user)

    def test_follow_and_unfollow(self):
        response = self.client.post("/api/v1/users/trinity/follow/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_following"])
        self.assertEqual(response.data["followers_count"], 1)
        self.assertTrue(Follow.objects.filter(follower=self.user, following=self.other).exists())
        self.assertEqual(Notification.objects.filter(recipient=self.other).count(), 1)

        response = self.client.delete("/api/v1/users/trinity/follow/")
        self.assertFalse(response.data["is_following"])
        self.assertEqual(response.data["followers_count"], 0)
        # the follow notification disappears with the follow
        self.assertEqual(Notification.objects.filter(recipient=self.other).count(), 0)

    def test_follow_is_idempotent(self):
        self.client.post("/api/v1/users/trinity/follow/")
        self.client.post("/api/v1/users/trinity/follow/")
        self.assertEqual(Follow.objects.count(), 1)
        self.assertEqual(Notification.objects.count(), 1)

    def test_cannot_follow_self(self):
        response = self.client.post("/api/v1/users/neo/follow/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_follows_you_flag(self):
        Follow.objects.create(follower=self.other, following=self.user)
        response = self.client.get("/api/v1/users/trinity/")
        self.assertTrue(response.data["follows_you"])
        self.assertFalse(response.data["is_following"])

    def test_followers_and_following_lists(self):
        self.client.post("/api/v1/users/trinity/follow/")
        followers = self.client.get("/api/v1/users/trinity/followers/")
        self.assertEqual(followers.data["count"], 1)
        self.assertEqual(followers.data["results"][0]["username"], "neo")
        following = self.client.get("/api/v1/users/neo/following/")
        self.assertEqual(following.data["count"], 1)
        self.assertEqual(following.data["results"][0]["username"], "trinity")
        self.assertTrue(following.data["results"][0]["is_following"])

    def test_suggestions_exclude_followed_and_self(self):
        make_user("morpheus")
        self.client.post("/api/v1/users/trinity/follow/")
        response = self.client.get("/api/v1/users/suggestions/")
        usernames = [u["username"] for u in response.data]
        self.assertNotIn("neo", usernames)
        self.assertNotIn("trinity", usernames)
        self.assertIn("morpheus", usernames)
