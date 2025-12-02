import json
from channels.generic.websocket import AsyncWebsocketConsumer

class LogisticsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close()
        else:
            # Create a group for this specific user
            self.group_name = f"user_{self.user.id}"
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        # Handle incoming messages (e.g. location updates)
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'location_update':
            provider_id = data.get('provider_id')
            if provider_id:
                await self.channel_layer.group_send(
                    f"user_{provider_id}",
                    {
                        "type": "logistics_notification",
                        "message": {
                            "type": "collector_location",
                            "lat": data.get('lat'),
                            "lon": data.get('lon'),
                            "collector_id": self.user.id
                        }
                    }
                )

    async def logistics_notification(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event['message']))
