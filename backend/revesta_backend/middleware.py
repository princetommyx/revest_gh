import logging
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
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
        return response
