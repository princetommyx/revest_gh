from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from market.views import ListingViewSet
from logistics.views import PickupRequestViewSet
from chat.views import MessageViewSet
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
import os

# API v1 Router
router_v1 = DefaultRouter()
router_v1.register(r'market/listings', ListingViewSet, basename='listing')
router_v1.register(r'logistics/pickups', PickupRequestViewSet, basename='pickup')
router_v1.register(r'chat/messages', MessageViewSet, basename='message')

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # API Documentation (OpenAPI 3.0)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API v1 Endpoints
    path('api/v1/auth/', include('users.urls')),  # Authentication
    path('api/v1/users/', include('users.urls')),  # User profiles (will separate later)
    path('api/v1/admin/', include('admin_dashboard.urls')),  # Admin dashboard
    path('api/v1/wallet/', include('wallet.urls')),  # Wallet & transactions
    path('api/v1/', include(router_v1.urls)),  # ViewSet routes
    
    # Admin Dashboard Static Files
    path('dashboard/', serve, {'document_root': settings.BASE_DIR.parent / 'Bootstrap-Admin-Template-master' / 'dist-modern', 'path': 'index.html'}),
    re_path(r'^dashboard/(?P<path>.*)$', serve, {'document_root': settings.BASE_DIR.parent / 'Bootstrap-Admin-Template-master' / 'dist-modern'}),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

