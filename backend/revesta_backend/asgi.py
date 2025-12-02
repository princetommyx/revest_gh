import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
import logistics.routing
import chat.routing
from .middleware import JwtAuthMiddleware

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JwtAuthMiddleware(
        URLRouter(
            logistics.routing.websocket_urlpatterns +
            chat.routing.websocket_urlpatterns
        )
    ),
})
