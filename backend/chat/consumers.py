import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Message

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close()
            return

        # Room name based on sorted user IDs to ensure uniqueness per pair
        # URL route: /ws/chat/<other_user_id>/
        if 'other_user_id' in self.scope['url_route']['kwargs']:
            self.other_user_id = int(self.scope['url_route']['kwargs']['other_user_id'])
            users = sorted([self.user.id, self.other_user_id])
            self.room_group_name = f"chat_{users[0]}_{users[1]}"
        else:
            # General chat or lobby (optional, for now just a user-specific channel)
            self.room_group_name = f"user_{self.user.id}_updates"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        
        # Save message to DB
        saved_message = await self.save_message(message)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender_id': self.user.id,
                'sender_name': self.user.username,
                'timestamp': str(saved_message.timestamp)
            }
        )

    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def save_message(self, content):
        other_user = User.objects.get(id=self.other_user_id)
        return Message.objects.create(
            sender=self.user,
            receiver=other_user,
            content=content
        )
