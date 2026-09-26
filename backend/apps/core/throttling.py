from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """Rate limit for credential endpoints (login, register, password change).

    Keyed on the client address only: attackers are anonymous, or hold a
    token for a *different* account than the one they are attacking.
    """

    scope = "auth"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
