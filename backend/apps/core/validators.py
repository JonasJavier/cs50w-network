"""Backwards-compatible import location for upload validators."""

from apps.core.images import validate_upload_size

__all__ = ["validate_upload_size"]
