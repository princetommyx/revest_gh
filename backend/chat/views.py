from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Message
from .serializers import MessageSerializer, MessageCreateSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

from django.utils import timezone

@extend_schema(tags=['chat'])
@extend_schema_view(
    list=extend_schema(summary="List messages", description="Get all messages for the current user."),
    retrieve=extend_schema(summary="Get message details", description="Get a specific message."),
    create=extend_schema(summary="Send message", description="Send a new message to another user."),
)
class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return messages where current user is sender OR receiver
        """
        user = self.request.user
        return Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).order_by('-timestamp')

    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
    
    @extend_schema(summary="Get conversations")
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        print(f"DEBUG: conversations called by {request.user}")
        """
        Get list of unique users the current user has chatted with,
        along with the last message.
        """
        user = request.user
        # This is a simplified approach. Ideally we'd have a Conversation model.
        # Check messages sent or received
        sent_to = Message.objects.filter(sender=user).values_list('receiver', flat=True).distinct()
        received_from = Message.objects.filter(receiver=user).values_list('sender', flat=True).distinct()
        
        contact_ids = set(list(sent_to) + list(received_from))
        
        conversations = []
        for contact_id in contact_ids:
            contact = User.objects.filter(id=contact_id).first()
            if not contact:
                continue
                
            last_msg = Message.objects.filter(
                (Q(sender=user) & Q(receiver=contact)) |
                (Q(sender=contact) & Q(receiver=user))
            ).order_by('-timestamp').first()
            
            conversations.append({
                'contact_id': contact.id,
                'contact_username': contact.username,
                'contact_role': contact.role,
                'last_message': last_msg.content if last_msg else '',
                'timestamp': last_msg.timestamp if last_msg else None,
                'unread_count': 0 # TODO: Add is_read field to Message model
            })
        
        # Sort by last message timestamp
        conversations.sort(key=lambda x: x['timestamp'] or timezone.now(), reverse=True)
        
        return Response(conversations)

    @extend_schema(summary="Get messages with user")
    @action(detail=False, methods=['get'], url_path='with/(?P<user_id>[^/.]+)')
    def chat_with(self, request, user_id=None):
        """Get full chat history with a specific user"""
        user = request.user
        other_user = User.objects.filter(id=user_id).first()
        
        if not other_user:
            return Response({'error': 'User not found'}, status=404)
            
        messages = Message.objects.filter(
            (Q(sender=user) & Q(receiver=other_user)) |
            (Q(sender=other_user) & Q(receiver=user))
        ).order_by('timestamp') # Ascending for chat UI
        
        # Mark read logic could go here
        
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)
