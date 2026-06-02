import json
from channels.generic.websocket import AsyncWebsocketConsumer


class NotifConsumer(AsyncWebsocketConsumer):
    """Per-user notification WebSocket."""

    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close(code=4001)
            return
        self.room = f"user_{self.user.id}_notifs"
        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.room, self.channel_name)

    async def push_notif(self, event):
        await self.send(text_data=json.dumps({
            "type":       "notification",
            "title":      event.get("title"),
            "body":       event.get("body"),
            "notif_type": event.get("notif_type"),
            "payload":    event.get("payload", {}),
        }))