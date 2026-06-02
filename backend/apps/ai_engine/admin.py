from django.contrib import admin
from .models import AIInsight, AIChatHistory


@admin.register(AIInsight)
class AIInsightAdmin(admin.ModelAdmin):
    list_display    = ["insight_type", "title", "confidence", "acknowledged", "created_at"]
    list_filter     = ["insight_type", "acknowledged"]
    readonly_fields = ["id", "created_at"]


@admin.register(AIChatHistory)
class AIChatAdmin(admin.ModelAdmin):
    list_display    = ["user", "session_ctx", "created_at", "updated_at"]
    readonly_fields = ["id", "created_at", "updated_at"]