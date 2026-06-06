import logging
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import PickupSession, PickupRequest, PickupRequestChild, QueueEvent
from .serializers import PickupSessionSerializer, PickupRequestSerializer, QueueEventSerializer

log = logging.getLogger("apps.pickups")
cl  = get_channel_layer()


def _push(session_id: str):
    """Broadcast a queue-changed event to all watching WebSocket clients."""
    if cl:
        try:
            async_to_sync(cl.group_send)(
                f"session_{session_id}",
                {"type": "queue.update", "session_id": str(session_id)},
            )
        except Exception as e:
            log.warning(f"WS broadcast failed: {e}")


class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_school_staff


# ── Sessions ─────────────────────────────────────────────────────

class SessionListView(generics.ListCreateAPIView):
    serializer_class   = PickupSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        status = self.request.query_params.get("status")
        qs = PickupSession.objects.all()
        if status:
            qs = qs.filter(status=status)
        else:
            qs = qs.filter(status__in=["scheduled", "open", "active"])
        return qs.order_by("scheduled_start")


class SessionDetailView(generics.RetrieveUpdateAPIView):
    queryset           = PickupSession.objects.all()
    serializer_class   = PickupSessionSerializer
    permission_classes = [IsStaff]


@api_view(["POST"])
@permission_classes([IsStaff])
def session_open(request, pk):
    s = PickupSession.objects.get(pk=pk)
    s.status    = PickupSession.STATUS_OPEN
    s.opened_by = request.user
    s.save(update_fields=["status", "opened_by"])
    _push(str(pk))
    return Response(PickupSessionSerializer(s).data)


@api_view(["POST"])
@permission_classes([IsStaff])
def session_activate(request, pk):
    s = PickupSession.objects.get(pk=pk)
    s.status       = PickupSession.STATUS_ACTIVE
    s.actual_start = timezone.now()
    s.save(update_fields=["status", "actual_start"])
    _push(str(pk))
    return Response(PickupSessionSerializer(s).data)


@api_view(["POST"])
@permission_classes([IsStaff])
def session_close(request, pk):
    s = PickupSession.objects.get(pk=pk)
    s.status     = PickupSession.STATUS_CLOSED
    s.actual_end = timezone.now()
    s.save(update_fields=["status", "actual_end"])
    _push(str(pk))
    return Response(PickupSessionSerializer(s).data)


# ── Pickup Requests ───────────────────────────────────────────────

class RequestListView(generics.ListCreateAPIView):
    serializer_class   = PickupRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        u       = self.request.user
        session = self.request.query_params.get("session")
        qs = PickupRequest.objects.select_related("collector", "session").prefetch_related(
            "children__student__school_class__year_group"
        )
        if session:
            qs = qs.filter(session_id=session)
        if u.is_school_staff:
            return qs.order_by("queue_position", "created_at")
        return qs.filter(collector=u).order_by("-created_at")

    @transaction.atomic
    def perform_create(self, serializer):
        obj = serializer.save()
        pos = PickupRequest.objects.filter(
            session=obj.session,
            status__in=["pending", "en_route", "arrived", "in_queue"],
        ).exclude(id=obj.id).count() + 1
        obj.queue_position = pos
        obj.checked_in_at  = timezone.now()
        obj.save(update_fields=["queue_position", "checked_in_at"])
        QueueEvent.objects.create(
            session=obj.session, request=obj,
            event_type=QueueEvent.EV_CREATED, performed_by=self.request.user,
            metadata={"token": obj.queue_token, "position": pos},
        )
        _push(str(obj.session_id))


@api_view(["POST"])
@permission_classes([IsStaff])
def call_children(request, pk):
    """Mark children as called — walking out now.
    Works from ANY pre-collected status (pending, en_route, arrived, in_queue).
    This means staff can call a parent who is still 'pending' during testing
    or when geofencing is not active.
    """
    with transaction.atomic():
        req = PickupRequest.objects.get(pk=pk)
        # Accept call from any active status
        allowed = [
            PickupRequest.STATUS_PENDING,
            "en_route",
            PickupRequest.STATUS_ARRIVED,
            PickupRequest.STATUS_IN_QUEUE,
        ]
        if req.status not in allowed:
            return Response(
                {"error": f"Cannot call from status '{req.status}'"},
                status=400,
            )
        req.status   = PickupRequest.STATUS_CALLED
        req.called_at = timezone.now()
        req.save(update_fields=["status", "called_at"])
        PickupRequestChild.objects.filter(request=req).update(
            is_ready=True, readied_at=timezone.now(), readied_by=request.user
        )
        QueueEvent.objects.create(
            session=req.session, request=req,
            event_type=QueueEvent.EV_CALLED, performed_by=request.user,
        )
        _push(str(req.session_id))
    return Response({"status": "called", "token": req.queue_token})


@api_view(["POST"])
@permission_classes([IsStaff])
def complete_pickup(request, pk):
    """Confirm collection — child is safely with parent."""
    method = request.data.get("method", "manual")
    with transaction.atomic():
        req = PickupRequest.objects.get(pk=pk)
        req.status         = PickupRequest.STATUS_COLLECTED
        req.collected_at   = timezone.now()
        req.confirmed_by   = request.user
        req.confirm_method = method
        req.save()
        PickupRequestChild.objects.filter(request=req).update(was_collected=True)
        QueueEvent.objects.create(
            session=req.session, request=req,
            event_type=QueueEvent.EV_DONE, performed_by=request.user,
            metadata={"method": method},
        )
        _push(str(req.session_id))
    return Response({"status": "collected", "token": req.queue_token})


class EventListView(generics.ListAPIView):
    serializer_class   = QueueEventSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        session = self.request.query_params.get("session")
        if session:
            return QueueEvent.objects.filter(session_id=session)
        return QueueEvent.objects.none()

@api_view(["GET"])
@permission_classes([IsStaff])
def verify_qr(request, pk):
    """Gate staff scans parent QR code — returns pickup details for verification."""
    try:
        req_obj = PickupRequest.objects.select_related(
            "collector", "session"
        ).prefetch_related(
            "children__student__school_class__year_group"
        ).get(pk=pk)
    except PickupRequest.DoesNotExist:
        return Response({"error": "Invalid QR code"}, status=404)

    children = []
    for c in req_obj.children.all():
        children.append({
            "name":       c.student.full_name,
            "year_group": c.student.school_class.year_group.display_name,
            "class_name": c.student.school_class.name,
            "colour":     c.student.school_class.year_group.colour,
            "is_ready":   c.is_ready,
        })

    return Response({
        "id":             str(req_obj.id),
        "queue_token":    req_obj.queue_token,
        "status":         req_obj.status,
        "collector_name": req_obj.collector.full_name,
        "collector_phone": getattr(req_obj.collector, "phone", ""),
        "session_type":   req_obj.session.get_session_type_display(),
        "session_date":   str(req_obj.session.date),
        "children":       children,
        "checked_in_at":  str(req_obj.checked_in_at) if req_obj.checked_in_at else None,
        "ai_flagged":     req_obj.ai_flagged,
        "ai_risk_level":  req_obj.ai_risk_level,
    })
