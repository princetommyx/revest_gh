from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Message
from .serializers import MessageSerializer

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(
            Q(sender=self.request.user) | Q(receiver=self.request.user)
        ).order_by('timestamp')

    @action(detail=False, methods=['get'])
    def conversation(self, request):
        other_user_id = request.query_params.get('user_id')
        if not other_user_id:
            return Response({'error': 'user_id is required'}, status=400)
        
        messages = Message.objects.filter(
            (Q(sender=request.user) & Q(receiver_id=other_user_id)) |
            (Q(sender_id=other_user_id) & Q(receiver=request.user))
        ).order_by('timestamp')
        
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent_conversations(self, request):
        user = request.user
        # Get unique users from sent and received messages
        sent_to = Message.objects.filter(sender=user).values_list('receiver', flat=True).distinct()
        received_from = Message.objects.filter(receiver=user).values_list('sender', flat=True).distinct()
        
        user_ids = set(list(sent_to) + list(received_from))
        
        # Fetch user details
        from django.contrib.auth import get_user_model
        User = get_user_model()
        users = User.objects.filter(id__in=user_ids)
        
        # Simple serialization
        data = [{'id': u.id, 'username': u.username, 'role': u.role} for u in users]
        return Response(data)

    @action(detail=False, methods=['post'])
    def get_support_chat(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Find or create Support User
        support_user = User.objects.filter(is_support=True).first()
        if not support_user:
            # Create default support user if none exists
            if not User.objects.filter(username='Support').exists():
                support_user = User.objects.create_user(username='Support', email='support@revesta.com', password='supportpassword123', is_support=True)
            else:
                support_user = User.objects.get(username='Support')
                support_user.is_support = True
                support_user.save()
        
        return Response({
            'support_user_id': support_user.id,
            'support_username': support_user.username
        })

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
