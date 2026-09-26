from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, PostCommentsView, PostViewSet, TrendingHashtagsView

router = DefaultRouter()
router.register("posts", PostViewSet, basename="posts")
router.register("comments", CommentViewSet, basename="comments")

urlpatterns = [
    path("posts/<int:post_id>/comments/", PostCommentsView.as_view(), name="post-comments"),
    path("hashtags/trending/", TrendingHashtagsView.as_view(), name="hashtags-trending"),
    path("", include(router.urls)),
]
