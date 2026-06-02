"""In-app notifications"""
import uuid
from django.db import models
from apps.accounts.models import User


class Notification(models.Model):
    TYPES = [
        ("queue_update",  "Queue Position Update"),
        ("child_called",  "Child Called Out"),
        ("collected",     "Child Collected"),
        ("parent_arrived","Parent Arrived"),
        ("session_update","Session Update"),
        ("ai_alert",      "AI Alert"),
        ("general",       "General"),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient  = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notif_type = models.CharField(max_length=30, choices=TYPES, db_index=True)
    title      = models.CharField(max_length=255)
    body       = models.TextField()
    payload    = models.JSONField(default=dict)
    is_read    = models.BooleanField(default=False, db_index=True)
    read_at    = models.DateTimeField(null=True, blank=True)
    push_sent  = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes  = [models.Index(fields=["recipient", "is_read", "-created_at"])]