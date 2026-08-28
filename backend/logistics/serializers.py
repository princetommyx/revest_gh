from rest_framework import serializers
from .models import PickupRequest
from users.serializers import PublicUserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class PickupRequestListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for pickup list views
    """
    provider = PublicUserSerializer(read_only=True)
    collector_name = serializers.CharField(source='collector.username', read_only=True)
    provider_name = serializers.CharField(source='provider.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    track_type_display = serializers.CharField(source='get_track_type_display', read_only=True)
    listing_image = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = PickupRequest
        fields = (
            'id', 'material_type', 'track_type', 'track_type_display',
            'bag_size', 'weight_kg', 'quantity_estimate', 
            'status', 'status_display',
            'latitude', 'longitude', 'current_lat', 'current_lon', 'last_location_at',
            'distance_km',
            'pickup_address',
            'destination_latitude', 'destination_longitude', 'destination_address',
            'created_at', 'provider', 'collector', 'collector_name', 'provider_name',
            'estimated_price', 'actual_price', 'payment_method',
            'waste_price', 'delivery_fee', 'listing', 'listing_image',
            'is_verified'
        )
        read_only_fields = ('provider', 'collector', 'created_at', 'collector_name')

    def get_distance_km(self, obj):
        request = self.context.get('request')
        if not request or not request.query_params:
            return None
            
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        
        if lat and lon:
            try:
                from .utils import haversine
                dist = haversine(float(lat), float(lon), float(obj.latitude), float(obj.longitude))
                return round(dist, 2)
            except (ValueError, TypeError):
                pass
        return None

    def get_listing_image(self, obj):
        image_to_use = None
        if obj.image:
            image_to_use = obj.image
        elif obj.listing and obj.listing.image:
            image_to_use = obj.listing.image
            
        if image_to_use:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image_to_use.url)
            return image_to_use.url
        return None


class PickupRequestDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for detailed pickup views with tracking data
    """
    provider = PublicUserSerializer(read_only=True)
    collector = PublicUserSerializer(read_only=True)
    collector_name = serializers.CharField(source='collector.username', read_only=True)
    provider_name = serializers.CharField(source='provider.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    track_type_display = serializers.CharField(source='get_track_type_display', read_only=True)
    listing_image = serializers.SerializerMethodField()

    class Meta:
        model = PickupRequest
        fields = (
            'id', 'material_type', 'track_type', 'track_type_display',
            'bag_size', 'weight_kg', 'quantity_estimate', 
            'status', 'status_display',
            'latitude', 'longitude', 'current_lat', 'current_lon', 'last_location_at',
            'pickup_address',
            'destination_latitude', 'destination_longitude', 'destination_address',
            'created_at', 'provider', 'collector', 'collector_name', 'provider_name',
            'estimated_price', 'actual_price', 'payment_method',
            'waste_price', 'delivery_fee', 'listing', 'listing_image',
            'distance_km', 'duration_min',
            'verification_photo', 'manual_weight', 'ai_verified_weight', 'is_verified'
        )
        read_only_fields = ('provider', 'collector', 'created_at')

    def get_listing_image(self, obj):
        if obj.listing and obj.listing.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.listing.image.url)
            return obj.listing.image.url
        return None


class PickupRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating pickup requests
    """
    
    class Meta:
        model = PickupRequest
        fields = (
            'id', 'material_type', 'track_type', 'bag_size', 'weight_kg',
            'quantity_estimate', 'latitude', 'longitude', 'estimated_price',
            'waste_price', 'delivery_fee', 'listing',
            'distance_km', 'duration_min', 'payment_method',
            'pickup_address',
            'destination_latitude', 'destination_longitude', 'destination_address'
        )
    
    def validate_latitude(self, value):
        if not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value
    
    def validate_longitude(self, value):
        if not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value


class PickupRequestUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for status updates and tracking
    """
    
    class Meta:
        model = PickupRequest
        fields = ('id', 'status', 'current_lat', 'current_lon')
    
    def validate_status(self, value):
        """Validate status transitions"""
        instance = self.instance
        if instance:
            valid_transitions = {
                'PENDING': ['ACCEPTED', 'CANCELLED'],
                'ACCEPTED': ['ARRIVED', 'CANCELLED'],
                'ARRIVED': ['COMPLETED'],
                'COMPLETED': [],
                'CANCELLED': []
            }
            
            if instance.status in valid_transitions:
                if value not in valid_transitions[instance.status] and value != instance.status:
                    raise serializers.ValidationError(
                        f"Cannot transition from {instance.status} to {value}"
                    )
        return value


# Backward compatibility
class PickupRequestSerializer(PickupRequestDetailSerializer):
    """
    Legacy serializer
    """
    pass
