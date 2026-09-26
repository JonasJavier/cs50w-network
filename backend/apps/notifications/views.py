from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import generics, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import TimelineCursorPagination

from .models import Notification
from .serializers import NotificationSerializer


@extend_schema(tags=["notifications"])
class NotificationListView(generics.ListAPIView):
    """The authenticated user's notifications, newest first (cursor-paginated)."""

    serializer_class = NotificationSerializer
    pagination_class = TimelineCursorPagination
    queryset = Notification.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        queryset = Notification.objects.filter(recipient=self.request.user).select_related(
            "actor", "post", "post__repost_of", "comment"
        )
        if self.request.query_params.get("unread") in {"1", "true"}:
            queryset = queryset.filter(is_read=False)
        return queryset

    @extend_schema(parameters=[OpenApiParameter("unread", bool, description="Only unread")])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


@extend_schema(tags=["notifications"])
class UnreadCountView(APIView):
    @extend_schema(
        responses={200: inline_serializer("UnreadCount", {"count": serializers.IntegerField()})}
    )
    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"count": count})


@extend_schema(tags=["notifications"])
class MarkReadView(APIView):
    @extend_schema(
        request=None,
        responses={200: inline_serializer("MarkRead", {"ok": serializers.BooleanField()})},
    )
    def post(self, request, pk):
        updated = Notification.objects.filter(pk=pk, recipient=request.user).update(is_read=True)
        if not updated and not Notification.objects.filter(pk=pk, recipient=request.user).exists():
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"ok": True})


@extend_schema(tags=["notifications"])
class MarkAllReadView(APIView):
    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                "MarkAllRead",
                {"ok": serializers.BooleanField(), "updated": serializers.IntegerField()},
            )
        },
    )
    def post(self, request):
        updated = Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True
        )
        return Response({"ok": True, "updated": updated})


@extend_schema(tags=["notifications"])
class ClearNotificationsView(APIView):
    """Delete every notification of the authenticated user."""

    @extend_schema(
        request=None,
        responses={200: inline_serializer("Cleared", {"deleted": serializers.IntegerField()})},
    )
    def delete(self, request):
        deleted, _ = Notification.objects.filter(recipient=request.user).delete()
        return Response({"deleted": deleted})
