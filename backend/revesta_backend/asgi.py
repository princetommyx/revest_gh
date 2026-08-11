import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

print("Django setup completed.")

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
import logistics.routing
import chat.routing
import admin_dashboard.routing
from .middleware import JwtAuthMiddleware

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JwtAuthMiddleware(
        URLRouter(
            logistics.routing.websocket_urlpatterns +
            chat.routing.websocket_urlpatterns +
            admin_dashboard.routing.websocket_urlpatterns
        )
    ),
})
