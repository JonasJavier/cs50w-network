from django.apps import AppConfig


class PostsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.posts"
    label = "posts"

    def ready(self):
        from apps.core.files import register_file_cleanup

        from .models import Post

        register_file_cleanup(Post)
