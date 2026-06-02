from rest_framework import serializers
from .models import AIInsight, AIChatHistory


class AIInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AIInsight
        fields = "__all__"


class AIChatSerializer(serializers.ModelSerializer):
    class Meta:
        model        = AIChatHistory
        fields       = "__all__"
        read_only_fields = ["id", "user", "created_at", "updated_at"]