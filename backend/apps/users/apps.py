from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    label = "users"

    def ready(self):
        from apps.core.files import register_file_cleanup

        from .models import User

        register_file_cleanup(User)
