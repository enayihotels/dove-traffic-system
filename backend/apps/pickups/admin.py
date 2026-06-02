from django.contrib import admin
from .models import PickupSession, PickupRequest, PickupRequestChild, QueueEvent


@admin.register(PickupSession)
class PickupSessionAdmin(admin.ModelAdmin):
    list_display    = ["__str__", "status", "scheduled_start"]
    list_filter     = ["status", "session_type", "date"]
    date_hierarchy  = "date"
    readonly_fields = ["id", "created_at", "actual_start", "actual_end"]


@admin.register(PickupRequest)
class PickupRequestAdmin(admin.ModelAdmin):
    list_display    = ["queue_token", "collector", "status", "queue_position", "ai_flagged"]
    list_filter     = ["status", "ai_flagged"]
    search_fields   = ["queue_token", "collector__email"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(PickupRequestChild)
class PickupRequestChildAdmin(admin.ModelAdmin):
    list_display = ["student", "request", "is_ready", "was_collected"]


@admin.register(QueueEvent)
class QueueEventAdmin(admin.ModelAdmin):
    list_display    = ["event_type", "session", "timestamp"]
    list_filter     = ["event_type"]
    readonly_fields = ["id", "timestamp"]