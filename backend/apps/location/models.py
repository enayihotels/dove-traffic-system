"""GPS location tracking and geofence zones"""
import uuid
from django.db import models
from apps.accounts.models import User


class LocationSnapshot(models.Model):
    """GPS coordinates sent by a parent's device every ~15 seconds"""
    id                 = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user               = models.ForeignKey(User, on_delete=models.CASCADE, related_name="locations")
    latitude           = models.FloatField()
    longitude          = models.FloatField()
    accuracy_metres    = models.FloatField(null=True, blank=True)
    speed_mps          = models.FloatField(null=True, blank=True)
    heading            = models.FloatField(null=True, blank=True)
    distance_to_school = models.FloatField(null=True, blank=True)
    eta_seconds        = models.IntegerField(null=True, blank=True)
    inside_geofence    = models.BooleanField(default=False)
    recorded_at        = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "location_snapshots"
        ordering = ["-recorded_at"]
        indexes  = [models.Index(fields=["user", "-recorded_at"])]

    def __str__(self):
        return f"{self.user.full_name} @ {self.recorded_at:%H:%M:%S} ({self.distance_to_school or '?'}m)"


class GeofenceZone(models.Model):
    """Named circular zones that trigger automatic status updates"""
    ZONE_TYPES = [
        ("approach",   "Approach Zone ~500m — triggers en_route"),
        ("arrival",    "Arrival Zone ~100m — triggers arrived"),
        ("queue_area", "Queue Lane ~30m"),
        ("restricted", "Restricted — Staff Only"),
    ]

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name              = models.CharField(max_length=100)
    zone_type         = models.CharField(max_length=20, choices=ZONE_TYPES)
    center_lat        = models.FloatField()
    center_lng        = models.FloatField()
    radius_metres     = models.FloatField()
    is_active         = models.BooleanField(default=True)
    send_notification = models.BooleanField(default=True)

    class Meta:
        db_table = "geofence_zones"

    def __str__(self):
        return f"{self.name} (r={self.radius_metres}m)"