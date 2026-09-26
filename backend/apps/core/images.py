"""Server-side image normalisation for uploads.

Every uploaded image is:
  * validated as a real image (Pillow can decode it),
  * rotated according to its EXIF orientation, then stripped of metadata,
  * downscaled to fit the configured bounding box,
  * re-encoded as WebP (small, supports alpha) — animated GIFs are kept as-is.
"""

from __future__ import annotations

import io
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile, UploadedFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

Image.MAX_IMAGE_PIXELS = 40_000_000  # decompression-bomb guard (~40 MP)


def validate_upload_size(file):
    """Reject uploads larger than MAX_UPLOAD_SIZE (default 5 MB)."""
    max_size = settings.MAX_UPLOAD_SIZE
    if file and file.size > max_size:
        raise serializers.ValidationError(
            f"File too large. Maximum size is {max_size // (1024 * 1024)} MB."
        )
    return file


def process_image(file: UploadedFile, kind: str) -> UploadedFile:
    """Return a normalised copy of ``file`` for the given ``kind``.

    ``kind`` is a key of ``settings.IMAGE_MAX_DIMENSIONS`` (post, avatar, cover).
    Raises ``serializers.ValidationError`` if the payload is not a valid image.
    """
    if not file:
        return file

    max_size = settings.IMAGE_MAX_DIMENSIONS[kind]
    try:
        file.seek(0)
        image = Image.open(file)
        image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise serializers.ValidationError("Upload a valid image (JPEG, PNG, WebP or GIF).") from exc

    # Keep animated GIFs untouched — re-encoding would drop the animation.
    if image.format == "GIF" and getattr(image, "n_frames", 1) > 1:
        file.seek(0)
        return file

    image = ImageOps.exif_transpose(image) or image
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "A" in image.getbands() or image.mode == "P" else "RGB")
    image.thumbnail(max_size, Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=settings.IMAGE_QUALITY, method=4)
    buffer.seek(0)

    name = f"{Path(file.name or 'upload').stem[:80]}.webp"
    return SimpleUploadedFile(name, buffer.read(), content_type="image/webp")
