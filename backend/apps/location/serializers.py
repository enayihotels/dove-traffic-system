from rest_framework import serializers
from .models import LocationSnapshot, GeofenceZone


class LocationUpdateSerializer(serializers.Serializer):
    latitude  = serializers.FloatField()
    longitude = serializers.FloatField()
    accuracy  = serializers.FloatField(required=False, allow_null=True)
    speed     = serializers.FloatField(required=False, allow_null=True)
    heading   = serializers.FloatField(required=False, allow_null=True)


class GeofenceZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model  = GeofenceZone
        fields = "__all__"