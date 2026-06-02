"""Students — year groups, classes, pupils, authorised collectors"""
import uuid
from django.db import models
from apps.accounts.models import User


class YearGroup(models.Model):
    """British curriculum year groups: Nursery → Year 6"""
    YEAR_CHOICES = [
        ("nursery",   "Nursery (Age 3–4)"),
        ("reception", "Reception (Age 4–5)"),
        ("year_1",    "Year 1 (Age 5–6)"),
        ("year_2",    "Year 2 (Age 6–7)"),
        ("year_3",    "Year 3 (Age 7–8)"),
        ("year_4",    "Year 4 (Age 8–9)"),
        ("year_5",    "Year 5 (Age 9–10)"),
        ("year_6",    "Year 6 (Age 10–11)"),
    ]
    SESSION_CHOICES = [
        ("eyfs",    "EYFS (Early Years Foundation Stage)"),
        ("primary", "Primary"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name         = models.CharField(max_length=20, choices=YEAR_CHOICES, unique=True)
    session_type = models.CharField(max_length=10, choices=SESSION_CHOICES)
    display_name = models.CharField(max_length=100)
    pickup_order = models.PositiveSmallIntegerField(default=0)
    colour_hex   = models.CharField(max_length=7, default="#3B82F6")

    class Meta:
        db_table = "year_groups"
        ordering = ["pickup_order"]

    def __str__(self):
        return self.display_name


class SchoolClass(models.Model):
    """A form/class within a year group"""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=100)
    year_group  = models.ForeignKey(YearGroup, on_delete=models.CASCADE, related_name="classes")
    teacher     = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        limit_choices_to={"role": "teacher"}, related_name="classes_taught"
    )
    room_number = models.CharField(max_length=20, blank=True)
    is_active   = models.BooleanField(default=True)

    class Meta:
        db_table = "school_classes"
        ordering = ["year_group__pickup_order", "name"]
        verbose_name_plural = "School Classes"

    def __str__(self):
        return f"{self.name} ({self.year_group.display_name})"


class Student(models.Model):
    """A pupil enrolled at Doveland School"""
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name       = models.CharField(max_length=100)
    last_name        = models.CharField(max_length=100)
    date_of_birth    = models.DateField()
    school_class     = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="students")
    pupil_reference  = models.CharField(max_length=20, unique=True)
    photo            = models.ImageField(upload_to="students/%Y/", null=True, blank=True)
    is_active        = models.BooleanField(default=True)
    medical_notes    = models.TextField(blank=True)
    safe_word        = models.CharField(max_length=50, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "students"
        ordering = ["last_name", "first_name"]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return f"{self.full_name} ({self.school_class.name})"


class AuthorisedCollector(models.Model):
    """A parent/guardian authorised to collect a specific student"""
    RELATIONSHIP_CHOICES = [
        ("mother",        "Mother"),
        ("father",        "Father"),
        ("guardian",      "Legal Guardian"),
        ("grandparent",   "Grandparent"),
        ("sibling_18",    "Sibling (18+)"),
        ("childminder",   "Childminder"),
        ("family_friend", "Authorised Family Friend"),
        ("other",         "Other — ID Verified"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student      = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="collectors")
    user         = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="can_collect",
        limit_choices_to={"role": "parent"}
    )
    relationship       = models.CharField(max_length=30, choices=RELATIONSHIP_CHOICES)
    is_primary         = models.BooleanField(default=False)
    can_collect_alone  = models.BooleanField(default=True)
    id_verified        = models.BooleanField(default=False)
    verified_by        = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="verifications"
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    notes       = models.TextField(blank=True)

    class Meta:
        db_table       = "authorised_collectors"
        unique_together = [["student", "user"]]

    def __str__(self):
        return f"{self.user.full_name} → {self.student.full_name}"