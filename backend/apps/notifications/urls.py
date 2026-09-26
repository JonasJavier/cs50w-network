from django.urls import path

from .views import (
    ClearNotificationsView,
    MarkAllReadView,
    MarkReadView,
    NotificationListView,
    UnreadCountView,
)

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/unread-count/", UnreadCountView.as_view(), name="notifications-unread"),
    path("notifications/read-all/", MarkAllReadView.as_view(), name="notifications-read-all"),
    path("notifications/clear/", ClearNotificationsView.as_view(), name="notifications-clear"),
    path("notifications/<int:pk>/read/", MarkReadView.as_view(), name="notification-read"),
]
