from rest_framework import serializers
from .models import Message
from users.serializers import PublicUserSerializer


class MessageSerializer(serializers.ModelSerializer):
    """
    Full message serializer with sender/receiver details
    """
    sender = PublicUserSerializer(read_only=True)
    receiver = PublicUserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ('id', 'sender', 'receiver', 'content', 'timestamp')
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

