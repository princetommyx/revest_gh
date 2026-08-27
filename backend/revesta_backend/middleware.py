import logging
from datetime import timedelta
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)
User = get_user_model()

@database_sync_to_async
def get_user(token_key):
    try:
        token = AccessToken(token_key)
        user = User.objects.get(id=token['user_id'])
        return user
    except Exception as e:
        logger.error(f"JWT Auth Middleware Error: {e}")
        return AnonymousUser()

class JwtAuthMiddleware(BaseMiddleware):
    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        try:
            # Get token from query string
            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            token = query_params.get('token', [None])[0]
            
            if token:
                scope['user'] = await get_user(token)
            else:
                scope['user'] = AnonymousUser()
        except Exception as e:
            logger.error(f"Middleware Error: {e}")
            scope['user'] = AnonymousUser()
            
        return await super().__call__(scope, receive, send)

class ActivityTrackingMiddleware:
    """
    Records when an authenticated user was last seen, independent of login
    (JWT access tokens live for an hour and refresh silently, so Django's
    built-in last_login barely moves). Powers daily re-engagement targeting.
    Writes at most once every 5 minutes per user to avoid a DB write on
    every single request.
    """
    STALE_AFTER = timedelta(minutes=5)

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        user = getattr(request, 'user', None)
        if user is not None and getattr(user, 'is_authenticated', False):
            now = timezone.now()
            if not user.last_active_at or now - user.last_active_at > self.STALE_AFTER:
                type(user).objects.filter(pk=user.pk).update(last_active_at=now)

        return response


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log request method, path and content type
        print(f"DEBUG_MW: {request.method} {request.path} | Content-Type: {request.content_type}")
        
        # If it's the profile update, log more
        if request.path == '/api/v1/users/profile/' and request.method == 'PATCH':
            print("DEBUG_MW: Profile Update Detected!")
            print(f"DEBUG_MW: FILES: {list(request.FILES.keys())}")
            
        response = self.get_response(request)
        
        # Log 400 and 429 errors for promos
        if response.status_code in [400, 429] and '/api/v1/admin/promos/' in request.path:
            print(f"DEBUG_MW: {response.status_code} ERROR at {request.path}: {response.content.decode() if response.status_code == 400 else 'Rate Limited'}")
            
        return response
