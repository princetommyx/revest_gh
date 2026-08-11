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
        fields = ('id', 'sender', 'receiver', 'content', 'attachment', 'timestamp', 'is_read')
        read_only_fields = ('sender', 'timestamp')


class MessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for sending messages
    """
    
    class Meta:
        model = Message
        fields = ('id', 'receiver', 'content', 'attachment')
    
    def validate(self, data):
        content = data.get('content', '')
        attachment = data.get('attachment', None)
        
        if not content and not attachment:
            raise serializers.ValidationError("Message must have either content or an attachment.")
            
        if content and len(content) > 1000:
            raise serializers.ValidationError("Message is too long (max 1000 characters).")
            
        return data

class SupportSessionSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    admin = PublicUserSerializer(read_only=True)
    
    class Meta:
        model = SupportSession
        fields = ('id', 'user', 'admin', 'status', 'created_at', 'resolved_at')
        read_only_fields = ('created_at', 'resolved_at')
