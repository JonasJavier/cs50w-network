import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from PIL import Image
from rest_framework import serializers

from apps.core.images import process_image, validate_upload_size


def png_upload(width=2000, height=1000, name="photo.png", mode="RGB"):
    buffer = io.BytesIO()
    Image.new(mode, (width, height), (200, 50, 50) if mode == "RGB" else (200, 50, 50, 128)).save(
        buffer, format="PNG"
    )
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class ProcessImageTests(SimpleTestCase):
    def test_downscales_and_converts_to_webp(self):
        result = process_image(png_upload(), "post")
        self.assertEqual(result.name, "photo.webp")
        image = Image.open(result)
        self.assertEqual(image.format, "WEBP")
        self.assertLessEqual(max(image.size), 1600)
        self.assertEqual(image.size, (1600, 800))

    def test_avatar_bounding_box(self):
        image = Image.open(process_image(png_upload(3000, 3000), "avatar"))
        self.assertEqual(image.size, (512, 512))

    def test_keeps_alpha_channel(self):
        image = Image.open(process_image(png_upload(100, 100, mode="RGBA"), "post"))
        self.assertEqual(image.mode, "RGBA")

    def test_small_images_are_not_upscaled(self):
        image = Image.open(process_image(png_upload(100, 50), "post"))
        self.assertEqual(image.size, (100, 50))

    def test_rejects_non_images(self):
        fake = SimpleUploadedFile("evil.png", b"not-an-image", content_type="image/png")
        with self.assertRaises(serializers.ValidationError):
            process_image(fake, "post")

    def test_preserves_animated_gif(self):
        frames = [Image.new("RGB", (20, 20), color=(i * 80, 0, 0)) for i in range(3)]
        buffer = io.BytesIO()
        frames[0].save(buffer, format="GIF", save_all=True, append_images=frames[1:])
        upload = SimpleUploadedFile("anim.gif", buffer.getvalue(), content_type="image/gif")
        result = process_image(upload, "post")
        self.assertEqual(result.name, "anim.gif")


class UploadSizeTests(SimpleTestCase):
    @override_settings(MAX_UPLOAD_SIZE=1024)
    def test_rejects_large_uploads(self):
        with self.assertRaises(serializers.ValidationError):
            validate_upload_size(SimpleUploadedFile("big.png", b"x" * 2048))

    def test_accepts_small_uploads(self):
        upload = SimpleUploadedFile("small.png", b"x" * 10)
        self.assertIs(validate_upload_size(upload), upload)
