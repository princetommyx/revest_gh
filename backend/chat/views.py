from rest_framework import viewsets, permissions, filters, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Message, SupportSession
from .serializers import MessageSerializer, MessageCreateSerializer, SupportSessionSerializer
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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
        Return messages where current user is sender OR receiver, excluding
        anyone on either side of a block.
        """
        from moderation.models import BlockedUser

        user = self.request.user
        blocked_ids = BlockedUser.blocked_user_ids(user)
        qs = Message.objects.filter(Q(sender=user) | Q(receiver=user))
        if blocked_ids:
            qs = qs.exclude(Q(sender_id__in=blocked_ids) | Q(receiver_id__in=blocked_ids))
        return qs.order_by('-timestamp')

    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer

    def perform_create(self, serializer):
        from moderation.models import BlockedUser

        # Enforced in both directions: the person who was blocked must not be
        # able to keep messaging the person who blocked them.
        receiver = serializer.validated_data.get('receiver')
        if receiver and BlockedUser.is_blocked_between(self.request.user, receiver):
            raise PermissionDenied("You can't send messages to this user.")

        message = serializer.save(sender=self.request.user)

        # Send email notification
        from users.email_service import send_message_notification_email
        send_message_notification_email(message.sender, message.receiver, message.content)

        # Real-time push to both participants over the chat websocket -
        # same room-naming scheme ChatConsumer uses, so either side gets
        # the message instantly instead of waiting on the next poll.
        try:
            channel_layer = get_channel_layer()
            user_ids = sorted([message.sender_id, message.receiver_id])
            room_group_name = f"chat_{user_ids[0]}_{user_ids[1]}"
            payload = MessageSerializer(message, context={'request': self.request}).data
            async_to_sync(channel_layer.group_send)(
                room_group_name,
                {'type': 'chat_message', 'message': payload}
            )
        except Exception:
            pass  # Don't fail message creation if the realtime push fails

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return full message for frontend stability
        full_serializer = MessageSerializer(serializer.instance, context={'request': request})
        headers = self.get_success_headers(full_serializer.data)
        return Response(full_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @extend_schema(summary="Get conversations")
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        print(f"DEBUG: conversations called by {request.user}")
        """
        Get list of unique users the current user has chatted with,
        along with the last message.
        """
        from moderation.models import BlockedUser

        user = request.user
        # This is a simplified approach. Ideally we'd have a Conversation model.
        # Check messages sent or received
        sent_to = Message.objects.filter(sender=user).values_list('receiver', flat=True).distinct()
        received_from = Message.objects.filter(receiver=user).values_list('sender', flat=True).distinct()

        contact_ids = set(list(sent_to) + list(received_from))
        # Blocked threads disappear from the inbox entirely, in both directions.
        contact_ids -= BlockedUser.blocked_user_ids(user)

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
                'contact_profile_image': contact.profile_picture_url,
                'contact_is_online': contact.is_online,
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
        from moderation.models import BlockedUser

        user = request.user
        other_user = User.objects.filter(id=user_id).first()

        if not other_user:
            return Response({'error': 'User not found'}, status=404)

        if BlockedUser.is_blocked_between(user, other_user):
            return Response(
                {'error': 'This conversation is unavailable.', 'code': 'blocked'},
                status=403,
            )

        messages = Message.objects.filter(
            (Q(sender=user) & Q(receiver=other_user)) |
            (Q(sender=other_user) & Q(receiver=user))
        ).order_by('timestamp') # Ascending for chat UI
        
        # Mark read logic could go here
        
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)

class SupportSessionViewSet(viewsets.ModelViewSet):
    queryset = SupportSession.objects.all()
    serializer_class = SupportSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_support or user.role == 'ADMIN':
            return SupportSession.objects.all().order_by('-created_at')
        return SupportSession.objects.filter(user=user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        session = self.get_object()
        if not (request.user.is_staff or request.user.is_support or request.user.role == 'ADMIN'):
            return Response({'error': 'Not authorized'}, status=403)
        
        session.admin = request.user
        session.save()
        return Response({'status': 'claimed'})

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        session = self.get_object()
        session.status = SupportSession.Status.RESOLVED
        session.resolved_at = timezone.now()
        session.save()
        return Response({'status': 'resolved'})
