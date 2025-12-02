from rest_framework import serializers
from .models import PickupRequest

class PickupRequestSerializer(serializers.ModelSerializer):
    provider_name = serializers.ReadOnlyField(source='provider.username')
    collector_name = serializers.ReadOnlyField(source='collector.username')

    class Meta:
        model = PickupRequest
        fields = '__all__'
        read_only_fields = ('provider', 'collector', 'created_at', 'status')
