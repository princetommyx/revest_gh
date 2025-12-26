from rest_framework import serializers
from django.contrib.auth import get_user_model

import uuid

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'phone_number', 'city', 'vehicle_type', 'license_plate', 'company_name', 'tax_id', 'national_id', 'is_verified', 'password', 'is_online', 'current_lat', 'current_lon', 'is_staff', 'is_superuser')
        extra_kwargs = {
            'password': {'write_only': True},
            'is_staff': {'read_only': True},
            'is_superuser': {'read_only': True},
        }

    def create(self, validated_data):
        if 'username' not in validated_data:
            validated_data['username'] = f"user_{uuid.uuid4().hex[:8]}"
            
        user = User.objects.create_user(**validated_data)
        return user
