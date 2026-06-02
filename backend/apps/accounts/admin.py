from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseAdmin
from .models import User, ParentProfile


@admin.register(User)
class UserAdmin(BaseAdmin):
    list_display    = ["email", "full_name", "role", "is_active", "date_joined"]
    list_filter     = ["role", "is_active"]
    search_fields   = ["email", "first_name", "last_name"]
    ordering        = ["-date_joined"]
    readonly_fields = ["id", "date_joined", "last_seen"]
    fieldsets = (
        (None,          {"fields": ("id", "email", "password")}),
        ("Personal",    {"fields": ("first_name", "last_name", "phone", "avatar")}),
        ("Role",        {"fields": ("role", "is_active", "is_staff", "is_superuser")}),
        ("Activity",    {"fields": ("date_joined", "last_seen", "fcm_token")}),
    )
    add_fieldsets = ((None, {"fields": (
        "email", "first_name", "last_name", "role", "password1", "password2"
    )}),)


@admin.register(ParentProfile)
class ParentProfileAdmin(admin.ModelAdmin):
    list_display  = ["user", "id_verified", "vehicle_registration"]
    list_filter   = ["id_verified"]
    search_fields = ["user__email", "user__first_name", "vehicle_registration"]