import math
import logging
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import LocationSnapshot, GeofenceZone
from .serializers import LocationUpdateSerializer, GeofenceZoneSerializer
from apps.pickups.models import PickupRequest

log = logging.getLogger("apps.location")
cl  = get_channel_layer()


def haversine(lat1, lon1, lat2, lon2) -> float:
    """Great-circle distance in metres (Haversine formula)."""
    R  = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a  = math.sin(dp/2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def update_location(request):
    """
    Receive GPS from a parent's device.
    1. Calculate distance to school using Haversine
    2. Detect geofence entry
    3. Auto-update pickup request status if inside geofence
    4. Broadcast to staff dashboard via WebSocket
    """
    ser = LocationUpdateSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=400)

    d = ser.validated_data
    lat, lng = d["latitude"], d["longitude"]

    dist   = haversine(lat, lng, settings.SCHOOL_LAT, settings.SCHOOL_LNG)
    fenced = dist <= settings.GEOFENCE_METRES
    speed  = d.get("speed") or 0
    eta    = int(dist / speed) if speed and speed > 0.5 else None

    LocationSnapshot.objects.create(
        user=request.user,
        latitude=lat, longitude=lng,
        accuracy_metres=d.get("accuracy"),
        speed_mps=speed if speed else None,
        heading=d.get("heading"),
        distance_to_school=round(dist, 1),
        eta_seconds=eta,
        inside_geofence=fenced,
    )

    # Auto-update active pickups when parent enters geofence
    if fenced:
        active = PickupRequest.objects.filter(
            collector=request.user,
            status__in=[PickupRequest.STATUS_PENDING, PickupRequest.STATUS_EN_ROUTE],
        )
        for req in active:
            req.status     = PickupRequest.STATUS_ARRIVED
            req.arrived_at = timezone.now()
            if eta:
                req.eta = timezone.now() + timedelta(seconds=eta)
            req.save(update_fields=["status", "arrived_at", "eta"])

    # Push to staff dashboard
    if cl:
        try:
            async_to_sync(cl.group_send)(
                "staff_dashboard",
                {
                    "type":      "parent.location",
                    "user_id":   str(request.user.id),
                    "user_name": request.user.full_name,
                    "dist":      round(dist, 1),
                    "fenced":    fenced,
                    "eta":       eta,
                },
            )
        except Exception as e:
            log.debug(f"Dashboard WS push failed: {e}")

    return Response({
        "distance_metres": round(dist, 1),
        "inside_geofence": fenced,
        "eta_seconds": eta,
        "status": "recorded",
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_zones(request):
    zones = GeofenceZone.objects.filter(is_active=True)
    return Response(GeofenceZoneSerializer(zones, many=True).data)