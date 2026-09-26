"""Root URL configuration for the Network API."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from apps.core.views import HealthView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/", include("apps.users.urls")),
    path("api/v1/", include("apps.posts.urls")),
    path("api/v1/", include("apps.notifications.urls")),
    # OpenAPI schema & docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.SERVE_MEDIA:
    # Local-disk uploads (development, or a mounted volume in production).
    urlpatterns.append(
        re_path(
            rf"^{settings.MEDIA_URL.lstrip('/')}(?P<path>.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
            name="media",
        )
    )
