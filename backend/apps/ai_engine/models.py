"""AI insights and chat history"""
import uuid
from django.db import models
from apps.accounts.models import User
from apps.pickups.models import PickupSession


class AIInsight(models.Model):
    TYPE_PREDICTION = "prediction"
    TYPE_ALERT      = "alert"
    TYPE_SUGGESTION = "suggestion"
    TYPE_SUMMARY    = "summary"

    TYPES = [
        (TYPE_PREDICTION, "Queue Peak Prediction"),
        (TYPE_ALERT,      "Safety / Anomaly Alert"),
        (TYPE_SUGGESTION, "Staff Recommendation"),
        (TYPE_SUMMARY,    "Post-Session Summary"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session      = models.ForeignKey(
        PickupSession, on_delete=models.CASCADE,
        related_name="ai_insights", null=True, blank=True
    )
    insight_type = models.CharField(max_length=20, choices=TYPES, db_index=True)
    title        = models.CharField(max_length=255)
    content      = models.TextField()
    confidence   = models.FloatField(null=True, blank=True)
    raw_data     = models.JSONField(default=dict)
    acknowledged = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_insights"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.insight_type}] {self.title}"


class AIChatHistory(models.Model):
    """Per-user conversation history with the AI assistant"""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ai_chats")
    session_ctx = models.ForeignKey(
        PickupSession, on_delete=models.SET_NULL, null=True, blank=True
    )
    messages    = models.JSONField(default=list)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_chat_history"
        ordering = ["-updated_at"]