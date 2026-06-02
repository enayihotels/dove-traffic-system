from rest_framework import serializers
from .models import PickupSession, PickupRequest, PickupRequestChild, QueueEvent
from apps.students.serializers import StudentSerializer


class PickupSessionSerializer(serializers.ModelSerializer):
    active_count    = serializers.SerializerMethodField()
    collected_count = serializers.SerializerMethodField()
    pending_count   = serializers.SerializerMethodField()

    class Meta:
        model        = PickupSession
        fields       = "__all__"
        read_only_fields = [
            "id", "actual_start", "actual_end", "created_at",
            "ai_peak_time", "ai_peak_duration", "ai_confidence",
        ]

    def get_active_count(self, obj):
        return obj.requests.filter(status__in=["arrived", "in_queue", "called"]).count()

    def get_collected_count(self, obj):
        return obj.requests.filter(status="collected").count()

    def get_pending_count(self, obj):
        return obj.requests.filter(status__in=["pending", "en_route"]).count()


class PickupChildSerializer(serializers.ModelSerializer):
    student    = StudentSerializer(read_only=True)
    student_id = serializers.UUIDField(write_only=True)

    class Meta:
        model        = PickupRequestChild
        fields       = ["id", "student", "student_id", "is_ready", "readied_at", "was_collected"]
        read_only_fields = ["id", "is_ready", "readied_at"]


class PickupRequestSerializer(serializers.ModelSerializer):
    children        = PickupChildSerializer(many=True, read_only=True)
    collector_name  = serializers.CharField(source="collector.full_name", read_only=True)
    collector_phone = serializers.CharField(source="collector.phone",     read_only=True)
    student_ids     = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=True, min_length=1
    )

    class Meta:
        model  = PickupRequest
        fields = [
            "id", "session", "collector", "collector_name", "collector_phone",
            "status", "queue_position", "queue_token",
            "checked_in_at", "arrived_at", "called_at", "collected_at", "eta",
            "checkin_lat", "checkin_lng", "checkin_dist",
            "children", "student_ids",
            "ai_flagged", "ai_risk_level", "ai_flag_reason",
            "staff_notes", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "collector", "queue_position", "queue_token",
            "checked_in_at", "arrived_at", "called_at", "collected_at",
            "ai_flagged", "ai_risk_level", "ai_flag_reason",
            "created_at", "updated_at",
        ]

    def create(self, validated_data):
        student_ids = validated_data.pop("student_ids")
        validated_data["collector"] = self.context["request"].user
        obj = PickupRequest.objects.create(**validated_data)
        for sid in student_ids:
            PickupRequestChild.objects.create(request=obj, student_id=sid)
        return obj


class QueueEventSerializer(serializers.ModelSerializer):
    class Meta:
        model  = QueueEvent
        fields = "__all__"