from rest_framework import serializers
from .models import Listing

class ListingSerializer(serializers.ModelSerializer):
    seller_name = serializers.ReadOnlyField(source='seller.username')

    class Meta:
        model = Listing
        fields = '__all__'
        read_only_fields = ('seller', 'created_at')
