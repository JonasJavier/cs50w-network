from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q


class EmailOrUsernameBackend(ModelBackend):
    """Let people sign in with either their username or their e-mail address."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        if username is None or password is None:
            return None

        lookup = Q(username__iexact=username)
        if "@" in username:
            lookup |= Q(email__iexact=username)

        user = User.objects.filter(lookup).order_by("pk").first()
        if user is None:
            # Run the hasher anyway so timing does not reveal whether the account exists.
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
