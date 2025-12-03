from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from market.views import ListingViewSet
from logistics.views import PickupRequestViewSet
from chat.views import MessageViewSet

router = DefaultRouter()
router.register(r'listings', ListingViewSet)
router.register(r'pickups', PickupRequestViewSet)
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/', include('wallet.urls')),
    path('api/', include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
