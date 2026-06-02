"""
WebSocket consumers.
  QueueConsumer     — live queue state for a pickup session
  DashboardConsumer — parent GPS pings + queue alerts for staff
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

log = logging.getLogger("apps.pickups.ws")


class QueueConsumer(AsyncWebsocketConsumer):
    """Connect: ws://host/ws/queue/<session_id>/"""

    async def connect(self):
        self.sid  = self.scope["url_route"]["kwargs"]["session_id"]
        self.room = f"session_{self.sid}"
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()
        await self._send_state()          # push current queue immediately

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.room, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get("action") == "refresh":
                await self._send_state()
        except json.JSONDecodeError:
            pass

    async def queue_update(self, event):
        """Called when _push() broadcasts an update."""
        await self._send_state()

    async def _send_state(self):
        rows = await self._get_queue()
        await self.send(text_data=json.dumps({"type": "queue_state", "requests": rows}))

    @database_sync_to_async
    def _get_queue(self):
        from .models import PickupRequest
        from .serializers import PickupRequestSerializer
        qs = PickupRequest.objects.filter(
            session_id=self.sid,
            status__in=["pending", "en_route", "arrived", "in_queue", "called"],
        ).select_related("collector").prefetch_related(
            "children__student__school_class__year_group"
        ).order_by("queue_position", "created_at")
        return PickupRequestSerializer(qs, many=True).data


class DashboardConsumer(AsyncWebsocketConsumer):
    """Staff dashboard — receives location pings and queue updates."""

    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated or not self.user.is_school_staff:
            await self.close(code=4003)
            return
        await self.channel_layer.group_add("staff_dashboard", self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard("staff_dashboard", self.channel_name)

    async def parent_location(self, event):
        await self.send(text_data=json.dumps({
            "type": "parent_location",
            **{k: v for k, v in event.items() if k != "type"},
        }))

    async def queue_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "queue_update",
            "session_id": event.get("session_id"),
        }))