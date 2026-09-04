from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import BlockedUserViewSet, BlockUserView, UnblockUserView, ReportViewSet

router = DefaultRouter()
router.register(r'blocked', BlockedUserViewSet, basename='blocked-user')
router.register(r'reports', ReportViewSet, basename='report')

urlpatterns = [
    path('block/', BlockUserView.as_view(), name='block_user'),
    path('block/<int:user_id>/', UnblockUserView.as_view(), name='unblock_user'),
    path('', include(router.urls)),
]
