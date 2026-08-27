from rest_framework import serializers
from .models import Listing
from users.serializers import PublicUserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class ListingListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing views (optimized for mobile)
    """
    seller = PublicUserSerializer(read_only=True)
    seller_name = serializers.ReadOnlyField(source='seller.username')
    distance_km = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    total_likes = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            'id', 'title', 'material_type', 'quantity', 'price', 'is_free',
            'location', 'image', 'created_at', 'seller', 'seller_name', 'track',
            'distance_km', 'is_liked', 'total_likes'
        )
        read_only_fields = ('seller', 'created_at')

    def get_distance_km(self, obj):
        request = self.context.get('request')
        if not request or not request.query_params:
            return None

        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')

        if lat and lon:
            try:
                from logistics.utils import haversine
                dist = haversine(float(lat), float(lon), float(obj.latitude), float(obj.longitude))
                return round(dist, 2)
            except (ValueError, TypeError):
                pass
        return None

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.liked_by.filter(id=request.user.id).exists()

    def get_total_likes(self, obj):
        return obj.liked_by.count()


class ListingDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for detailed listing views
    """
    seller = PublicUserSerializer(read_only=True)
    seller_name = serializers.ReadOnlyField(source='seller.username')
    seller_phone = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    total_likes = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            'id', 'title', 'material_type', 'description', 'quantity',
            'price', 'is_free', 'location', 'latitude', 'longitude', 'image', 'created_at',
            'seller', 'seller_name', 'seller_phone', 'track', 'is_liked', 'total_likes'
        )
        read_only_fields = ('seller', 'created_at')

    def get_seller_phone(self, obj):
        """Only show phone if user is authenticated"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.seller.phone_number
        return None

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.liked_by.filter(id=request.user.id).exists()

    def get_total_likes(self, obj):
        return obj.liked_by.count()


class ListingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating listings
    """
    
    class Meta:
        model = Listing
        fields = (
            'id', 'title', 'material_type', 'description', 'quantity',
            'price', 'is_free', 'location', 'latitude', 'longitude', 'image', 'track'
        )
    
    def validate_image(self, value):
        """Validate image file size and format"""
        if value:
            # Max 10MB
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("Image file size cannot exceed 10MB.")
            
            # Check format
            valid_formats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            if value.content_type not in valid_formats:
                raise serializers.ValidationError(
                    f"Invalid image format. Supported formats: JPEG, PNG, WebP."
                )
        return value
    
    def validate(self, attrs):
        """Validate price/is_free relationship"""
        if attrs.get('is_free') and attrs.get('price'):
            raise serializers.ValidationError(
                "Price should not be set if listing is free."
            )
        if not attrs.get('is_free') and not attrs.get('price'):
            raise serializers.ValidationError(
                "Price is required for non-free listings."
            )
        return attrs


# Backward compatibility
class ListingSerializer(ListingDetailSerializer):
    """
    Legacy serializer - use ListingDetailSerializer instead
    """
    pass

