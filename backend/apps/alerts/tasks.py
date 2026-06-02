"""Celery tasks for async notifications and housekeeping"""
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


@shared_task
def send_ws_notification(user_id: str, title: str, body: str,
                          notif_type: str, payload: dict):
    """Push a notification to a specific user via WebSocket."""
    cl = get_channel_layer()
    if not cl:
        return
    try:
        async_to_sync(cl.group_send)(
            f"user_{user_id}_notifs",
            {
                "type":       "push.notif",
                "title":      title,
                "body":       body,
                "notif_type": notif_type,
                "payload":    payload,
            },
        )
    except Exception:
        pass


@shared_task
def purge_old_locations():
    """Delete GPS snapshots older than 48 hours. Schedule daily."""
    from django.utils import timezone
    from datetime import timedelta
    from apps.location.models import LocationSnapshot
    cutoff  = timezone.now() - timedelta(hours=48)
    count, _ = LocationSnapshot.objects.filter(recorded_at__lt=cutoff).delete()
    return f"Purged {count} old location snapshots"