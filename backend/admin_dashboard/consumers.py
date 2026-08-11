import json
from channels.generic.websocket import AsyncWebsocketConsumer

class AdminConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        # Security check: only allow staff/superuser
        if self.user.is_anonymous or not (self.user.is_staff or self.user.is_superuser):
            await self.close()
            return

        self.room_group_name = 'admin_notifications'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive message from room group
    async def admin_notification(self, event):
        message = event['message']
        notification_type = event.get('notification_type', 'INFO')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': notification_type,
            'message': message,
            'data': event.get('data', {})
        }))
