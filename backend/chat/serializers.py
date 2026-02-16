from rest_framework import serializers
from .models import Message, SupportSession
from users.serializers import PublicUserSerializer


class MessageSerializer(serializers.ModelSerializer):
    """
    Full message serializer with sender/receiver details
    """
    sender = PublicUserSerializer(read_only=True)
    receiver = PublicUserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ('id', 'sender', 'receiver', 'content', 'timestamp', 'is_read')
        read_only_fields = ('sender', 'timestamp')


class MessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for sending messages
    """
    
    class Meta:
        model = Message
        fields = ('id', 'receiver', 'content')
    
    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        if len(value) > 1000:
            raise serializers.ValidationError("Message is too long (max 1000 characters).")
        return value

        return value

class SupportSessionSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    admin = PublicUserSerializer(read_only=True)
    
    class Meta:
        model = SupportSession
        fields = ('id', 'user', 'admin', 'status', 'created_at', 'resolved_at')
        read_only_fields = ('created_at', 'resolved_at')
