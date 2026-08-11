from rest_framework import serializers
from users.models import IdentityVerification
from users.kyc_utils import decrypt_id_number

class AdminKYCSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    id_number = serializers.SerializerMethodField()

    class Meta:
        model = IdentityVerification
        fields = [
            'id', 'user', 'username', 'email', 'role',
            'id_front_image', 'id_back_image', 'selfie_image',
            'id_number', 'status', 'rejection_reason',
            'created_at', 'updated_at'
        ]

    def get_id_number(self, obj):
        if not obj.id_number_encrypted:
            return None
        return decrypt_id_number(obj.id_number_encrypted)
