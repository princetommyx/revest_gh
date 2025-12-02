from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings
from urllib.parse import parse_qs

User = get_user_model()

@database_sync_to_async
def get_user(validated_token):
    try:
        user = User.objects.get(id=validated_token["user_id"])
        return user
    except User.DoesNotExist:
        return AnonymousUser()

class JwtAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Get the token
        query_string = scope.get("query_string", b"").decode("utf-8")
        qs = parse_qs(query_string)
        token = qs.get("token", [None])[0]

        if token is None:
            scope["user"] = AnonymousUser()
        else:
            try:
                # Validate the token
                UntypedToken(token)
                # Decode the token
                decoded_data = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                # Get the user
                scope["user"] = await get_user(decoded_data)
            except (InvalidToken, TokenError, Exception) as e:
                print(f"JWT Auth Error: {e}")
                scope["user"] = AnonymousUser()

        return await self.app(scope, receive, send)
