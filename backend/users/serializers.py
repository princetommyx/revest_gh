from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from drf_spectacular.utils import extend_schema_field
import uuid

User = get_user_model()


class PublicUserSerializer(serializers.ModelSerializer):
    """
    Minimal user data for public consumption (listings, chats, etc.)
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'role', 'city', 'is_verified', 'is_online')
        read_only_fields = fields


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with password confirmation
    """
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'},
        label='Confirm Password'
    )
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'password', 'password2', 
            'role', 'phone_number', 'city',
            # Role-specific fields (optional during registration)
            'vehicle_type', 'license_plate',  # For COLLECTOR
            'company_name', 'tax_id', 'national_id', 'business_certification'  # For RECYCLER
        )
        extra_kwargs = {
            'email': {'required': True},
            'role': {'required': True},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value
    
    def create(self, validated_data):
        validated_data.pop('password2')
        
        # Auto-generate username if not provided
        if not validated_data.get('username'):
            validated_data['username'] = f"user_{uuid.uuid4().hex[:8]}"
        
        user = User.objects.create_user(**validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for viewing and editing user profile
    """
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'city', 'is_verified', 'is_online',
            # Role-specific fields
            'vehicle_type', 'license_plate',  # COLLECTOR
            'company_name', 'tax_id', 'national_id', 'business_certification',  # RECYCLER
            # Location
            'current_lat', 'current_lon',
            # Authentication Provider tracking
            'auth_provider', 'google_id', 'profile_picture_url',
            # Admin flags (read-only)
            'is_staff', 'is_superuser', 'is_support',
            # Timestamps
            'date_joined', 'last_login'
        )
        read_only_fields = (
            'id', 'is_verified', 'is_staff', 'is_superuser', 
            'is_support', 'date_joined', 'last_login',
            'auth_provider', 'google_id'
        )
    
    def to_representation(self, instance):
        """
        Customize representation based on user role
        """
        data = super().to_representation(instance)
        
        # Remove role-specific fields that don't apply
        if instance.role != 'COLLECTOR':
            data.pop('vehicle_type', None)
            data.pop('license_plate', None)
        
        if instance.role != 'RECYCLER':
            data.pop('company_name', None)
            data.pop('tax_id', None)
            data.pop('national_id', None)
            data.pop('business_certification', None)
        
        return data


class UserLocationSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for real-time location updates
    """
    latitude = serializers.FloatField(source='current_lat', required=True)
    longitude = serializers.FloatField(source='current_lon', required=True)
    
    class Meta:
        model = User
        fields = ('latitude', 'longitude', 'is_online')
    
    def validate_latitude(self, value):
        if not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value
    
    def validate_longitude(self, value):
        if not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change endpoint
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, 
        write_only=True, 
        validators=[validate_password]
    )
    new_password2 = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


# Keep original for backward compatibility (used in some views)
class UserSerializer(UserProfileSerializer):
    """
    Legacy serializer - redirects to UserProfileSerializer
    """
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta(UserProfileSerializer.Meta):
        fields = UserProfileSerializer.Meta.fields + ('password',)
    
    def create(self, validated_data):
        if 'username' not in validated_data:
            validated_data['username'] = f"user_{uuid.uuid4().hex[:8]}"
        
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

