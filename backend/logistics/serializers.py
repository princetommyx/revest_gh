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
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PickupRequest
        fields = (
            'id', 'material_type', 'quantity_estimate', 'status', 'status_display',
            'latitude', 'longitude', 'current_lat', 'current_lon',
            'created_at', 'provider', 'collector', 'collector_name',
            'estimated_price', 'actual_price', 'payment_method'
        )
        read_only_fields = ('provider', 'collector', 'created_at', 'collector_name')


class PickupRequestDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for detailed pickup views with tracking data
    """
    provider = PublicUserSerializer(read_only=True)
    collector =PublicUserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PickupRequest
        fields = (
            'id', 'material_type', 'quantity_estimate', 'status', 'status_display',
            'latitude', 'longitude', 'current_lat', 'current_lon',
            'created_at', 'provider', 'collector',
            'estimated_price', 'actual_price', 'payment_method',
            'distance_km', 'duration_min'
        )
        read_only_fields = ('provider', 'collector', 'created_at')


class PickupRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating pickup requests
    """
    
    class Meta:
        model = PickupRequest
        fields = (
            'id', 'material_type', 'quantity_estimate', 
            'latitude', 'longitude', 'estimated_price',
            'distance_km', 'duration_min', 'payment_method'
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
