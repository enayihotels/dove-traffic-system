"""User accounts with role-based access control"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", "admin")
        extra.setdefault("first_name", "Admin")
        extra.setdefault("last_name", "User")
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_ADMIN    = "admin"
    ROLE_TEACHER  = "teacher"
    ROLE_PARENT   = "parent"
    ROLE_GATE     = "gate_staff"
    ROLE_SECURITY = "security"

    ROLES = [
        (ROLE_ADMIN,    "School Administrator"),
        (ROLE_TEACHER,  "Teacher / Class Staff"),
        (ROLE_PARENT,   "Parent / Guardian"),
        (ROLE_GATE,     "Gate Staff"),
        (ROLE_SECURITY, "Security Officer"),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email       = models.EmailField(unique=True, db_index=True)
    first_name  = models.CharField(max_length=100)
    last_name   = models.CharField(max_length=100)
    role        = models.CharField(max_length=20, choices=ROLES, default=ROLE_PARENT, db_index=True)
    phone       = models.CharField(max_length=20, blank=True)
    avatar      = models.ImageField(upload_to="avatars/%Y/%m/", null=True, blank=True)
    fcm_token   = models.CharField(max_length=500, blank=True)
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_seen   = models.DateTimeField(null=True, blank=True)

    objects = UserManager()
    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "users"
        ordering = ["first_name", "last_name"]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_school_staff(self):
        return self.role in (self.ROLE_ADMIN, self.ROLE_TEACHER, self.ROLE_GATE, self.ROLE_SECURITY)

    def __str__(self):
        return f"{self.full_name} [{self.get_role_display()}]"


class ParentProfile(models.Model):
    """Extended info for parent/guardian accounts"""
    user                    = models.OneToOneField(User, on_delete=models.CASCADE, related_name="parent_profile")
    id_verified             = models.BooleanField(default=False)
    emergency_contact_name  = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    vehicle_registration    = models.CharField(max_length=15, blank=True)
    vehicle_colour          = models.CharField(max_length=40, blank=True)
    vehicle_make            = models.CharField(max_length=60, blank=True)
    notes                   = models.TextField(blank=True)
    created_at              = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "parent_profiles"

    def __str__(self):
        return f"Profile: {self.user.full_name}"