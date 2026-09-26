"""Operational endpoints that need no authentication."""

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Liveness/readiness probe used by Docker, Railway and uptime monitors.

    Returns 200 when the database answers, 503 otherwise. The cache is
    reported but never fails the probe (the API degrades gracefully without it).
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    @extend_schema(
        responses={200: OpenApiResponse(description="Service healthy")},
        auth=[],
        tags=["ops"],
    )
    def get(self, request):
        checks = {"database": "ok", "cache": "ok"}
        healthy = True

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as exc:  # pragma: no cover - only on infra failure
            checks["database"] = f"error: {exc.__class__.__name__}"
            healthy = False

        try:
            cache.set("health-probe", "1", 5)
            if cache.get("health-probe") != "1":
                checks["cache"] = "unavailable"
        except Exception as exc:  # pragma: no cover
            checks["cache"] = f"error: {exc.__class__.__name__}"

        payload = {
            "status": "ok" if healthy else "degraded",
            "version": settings.APP_VERSION,
            "checks": checks,
        }
        return Response(
            payload,
            status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
