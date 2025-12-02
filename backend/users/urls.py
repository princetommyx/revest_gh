from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, UserDetailView, UpdateLocationView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('me/location/', UpdateLocationView.as_view(), name='update_location'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
