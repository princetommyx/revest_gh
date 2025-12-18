from rest_framework import generics, permissions
from .serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer
    throttle_scope = 'register'

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class UpdateLocationView(generics.UpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        # Expecting 'lat', 'lon', 'is_online' in request.data
        # But serializer expects model fields.
        # We can just use the standard serializer if frontend sends correct field names.
        serializer.save()

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .models import PasswordResetOTP
from .notifications import generate_otp, send_mock_sms, send_mock_email

class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        identifier = request.data.get('identifier') # email or phone
        if not identifier:
            return Response({"error": "Identifier is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine if email or phone
        is_email = '@' in identifier
        
        try:
            if is_email:
                user = User.objects.get(email=identifier)
                # Generate token link
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                reset_link = f"http://localhost:5173/reset-password?uid={uid}&token={token}"
                
                send_mock_email(user.email, "Password Reset", f"Click here to reset: {reset_link}")
                return Response({"message": "Password reset email sent (check console)"})
                
            else:
                # Assume phone
                # Remove spaces, etc for better matching if needed
                user = User.objects.get(phone_number__icontains=identifier) # Simple lookup
                
                # Generate OTP
                otp = generate_otp()
                expiry = timezone.now() + timedelta(minutes=10)
                
                # Save OTP (Invalidate old ones)
                PasswordResetOTP.objects.filter(user=user).delete()
                PasswordResetOTP.objects.create(user=user, otp=otp, expires_at=expiry)
                
                send_mock_sms(user.phone_number, f"Your Revesta password code is: {otp}")
                return Response({"message": "Password reset OTP sent (check console)", "mode": "otp", "phone": user.phone_number})
                
        except User.DoesNotExist:
            # Don't reveal user existence? Or maybe do for now
            return Response({"error": "User not found with this identifier"}, status=status.HTTP_404_NOT_FOUND)

class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        mode = request.data.get('mode') # 'token' or 'otp'
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response({"error": "New password is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if mode == 'token':
            uidb64 = request.data.get('uid')
            token = request.data.get('token')
            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
                if default_token_generator.check_token(user, token):
                    user.set_password(new_password)
                    user.save()
                    return Response({"message": "Password reset successfully"})
                else:
                    return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)

        elif mode == 'otp':
            otp_code = request.data.get('otp')
            phone = request.data.get('phone') # or username/identifier to find user
            
            if not otp_code or not phone:
                 return Response({"error": "OTP and Phone required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                # Find user by phone first
                # In real app, we might send identifier in body
                user = User.objects.filter(phone_number__icontains=phone).first()
                if not user:
                    return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

                reset_otp = PasswordResetOTP.objects.filter(user=user, otp=otp_code).first()
                
                if reset_otp and reset_otp.is_valid():
                    user.set_password(new_password)
                    user.save()
                    reset_otp.delete() # Consume OTP
                    return Response({"message": "Password reset successfully"})
                else:
                    return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
        return Response({"error": "Invalid mode"}, status=status.HTTP_400_BAD_REQUEST)
