"""Pickup sessions, queue requests, audit events"""
import uuid
import random
from django.db import models
from django.utils import timezone
from apps.accounts.models import User
from apps.students.models import Student


def _make_token():
    letter = random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
    number = random.randint(1, 999)
    return f"{letter}-{number:03d}"


class PickupSession(models.Model):
    """A timed dismissal session — EYFS AM, EYFS PM, Primary PM, or extra"""
    TYPE_EYFS_AM    = "eyfs_am"
    TYPE_EYFS_PM    = "eyfs_pm"
    TYPE_PRIMARY_PM = "primary_pm"
    TYPE_EXTRA      = "extra"

    TYPES = [
        (TYPE_EYFS_AM,    "EYFS Morning Dismissal"),
        (TYPE_EYFS_PM,    "EYFS Afternoon Dismissal"),
        (TYPE_PRIMARY_PM, "Primary Afternoon Dismissal"),
        (TYPE_EXTRA,      "Extra / Ad-hoc Session"),
    ]

    STATUS_SCHEDULED = "scheduled"
    STATUS_OPEN      = "open"
    STATUS_ACTIVE    = "active"
    STATUS_CLOSED    = "closed"
    STATUS_CANCELLED = "cancelled"

    STATUSES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_OPEN,      "Open — Accepting Check-ins"),
        (STATUS_ACTIVE,    "Active — Dismissal In Progress"),
        (STATUS_CLOSED,    "Closed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_type     = models.CharField(max_length=20, choices=TYPES)
    date             = models.DateField(default=timezone.localdate)
    status           = models.CharField(max_length=20, choices=STATUSES, default=STATUS_SCHEDULED, db_index=True)
    scheduled_start  = models.TimeField()
    scheduled_end    = models.TimeField()
    actual_start     = models.DateTimeField(null=True, blank=True)
    actual_end       = models.DateTimeField(null=True, blank=True)
    opened_by        = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="opened_sessions"
    )
    notes            = models.TextField(blank=True)

    # AI prediction fields
    ai_peak_time     = models.TimeField(null=True, blank=True)
    ai_peak_duration = models.PositiveIntegerField(null=True, blank=True)
    ai_confidence    = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pickup_sessions"
        ordering = ["-date", "scheduled_start"]

    @property
    def is_accepting(self):
        return self.status in (self.STATUS_OPEN, self.STATUS_ACTIVE)

    def __str__(self):
        return f"{self.get_session_type_display()} — {self.date}"


class PickupRequest(models.Model):
    """A parent's check-in to collect one or more children"""
    STATUS_PENDING   = "pending"
    STATUS_EN_ROUTE  = "en_route"
    STATUS_ARRIVED   = "arrived"
    STATUS_IN_QUEUE  = "in_queue"
    STATUS_CALLED    = "called"
    STATUS_COLLECTED = "collected"
    STATUS_CANCELLED = "cancelled"
    STATUS_NO_SHOW   = "no_show"

    STATUSES = [
        (STATUS_PENDING,   "Pending — Submitted but not moving"),
        (STATUS_EN_ROUTE,  "En Route — Travelling to school"),
        (STATUS_ARRIVED,   "Arrived — At or near school"),
        (STATUS_IN_QUEUE,  "In Queue — Waiting for children"),
        (STATUS_CALLED,    "Called — Children walking out"),
        (STATUS_COLLECTED, "Collected ✓"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_NO_SHOW,   "No Show"),
    ]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session        = models.ForeignKey(PickupSession, on_delete=models.CASCADE, related_name="requests")
    collector      = models.ForeignKey(User, on_delete=models.CASCADE, related_name="requests")
    status         = models.CharField(max_length=20, choices=STATUSES, default=STATUS_PENDING, db_index=True)
    queue_position = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    queue_token    = models.CharField(max_length=10, unique=True, db_index=True)

    # Timestamps
    checked_in_at = models.DateTimeField(null=True, blank=True)
    arrived_at    = models.DateTimeField(null=True, blank=True)
    called_at     = models.DateTimeField(null=True, blank=True)
    collected_at  = models.DateTimeField(null=True, blank=True)

    # GPS at check-in
    checkin_lat  = models.FloatField(null=True, blank=True)
    checkin_lng  = models.FloatField(null=True, blank=True)
    checkin_dist = models.FloatField(null=True, blank=True)
    eta          = models.DateTimeField(null=True, blank=True)

    # Collection verification
    confirmed_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="confirmations"
    )
    confirm_method = models.CharField(
        max_length=20, blank=True,
        choices=[("qr","QR Code"),("pin","PIN"),("manual","Manual")]
    )
    staff_notes    = models.TextField(blank=True)

    # AI safety analysis
    ai_flagged     = models.BooleanField(default=False, db_index=True)
    ai_risk_level  = models.CharField(
        max_length=10, default="low",
        choices=[("low","Low"),("medium","Medium"),("high","High")]
    )
    ai_flag_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pickup_requests"
        ordering = ["queue_position", "created_at"]

    def save(self, *args, **kwargs):
        if not self.queue_token:
            token = _make_token()
            while PickupRequest.objects.filter(queue_token=token).exists():
                token = _make_token()
            self.queue_token = token
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.queue_token}] {self.collector.full_name} — {self.status}"


class PickupRequestChild(models.Model):
    """Which children are being collected in this request"""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request         = models.ForeignKey(PickupRequest, on_delete=models.CASCADE, related_name="children")
    student         = models.ForeignKey(Student, on_delete=models.CASCADE)
    is_ready        = models.BooleanField(default=False)
    readied_at      = models.DateTimeField(null=True, blank=True)
    readied_by      = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="readied_children"
    )
    was_collected = models.BooleanField(default=False)

    class Meta:
        db_table        = "pickup_request_children"
        unique_together = [["request", "student"]]

    def __str__(self):
        return f"{self.student.full_name} in [{self.request.queue_token}]"


class QueueEvent(models.Model):
    """Immutable audit log — every significant action is recorded here"""
    EV_CREATED   = "created"
    EV_CHANGED   = "status_changed"
    EV_CALLED    = "called"
    EV_DONE      = "completed"
    EV_CANCELLED = "cancelled"
    EV_AI_FLAG   = "ai_flagged"
    EV_OVERRIDE  = "override"

    EVENTS = [
        (EV_CREATED,   "Request Created"),
        (EV_CHANGED,   "Status Changed"),
        (EV_CALLED,    "Children Called Out"),
        (EV_DONE,      "Pickup Completed"),
        (EV_CANCELLED, "Cancelled"),
        (EV_AI_FLAG,   "AI Risk Flagged"),
        (EV_OVERRIDE,  "Manual Override"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session      = models.ForeignKey(PickupSession, on_delete=models.CASCADE, related_name="events")
    request      = models.ForeignKey(PickupRequest, on_delete=models.SET_NULL, null=True, blank=True)
    event_type   = models.CharField(max_length=30, choices=EVENTS, db_index=True)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    metadata     = models.JSONField(default=dict)
    timestamp    = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "queue_events"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"[{self.event_type}] {self.timestamp:%H:%M:%S}"