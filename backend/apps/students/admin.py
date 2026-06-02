from django.contrib import admin
from .models import YearGroup, SchoolClass, Student, AuthorisedCollector


@admin.register(YearGroup)
class YearGroupAdmin(admin.ModelAdmin):
    list_display  = ["display_name", "session_type", "pickup_order", "colour_hex"]
    list_editable = ["pickup_order", "colour_hex"]


@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display  = ["name", "year_group", "teacher", "room_number", "is_active"]
    list_filter   = ["year_group", "is_active"]
    search_fields = ["name"]


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display    = ["full_name", "pupil_reference", "school_class", "is_active"]
    list_filter     = ["school_class__year_group", "is_active"]
    search_fields   = ["first_name", "last_name", "pupil_reference"]
    readonly_fields = ["id", "created_at"]


@admin.register(AuthorisedCollector)
class AuthorisedCollectorAdmin(admin.ModelAdmin):
    list_display = ["user", "student", "relationship", "id_verified"]
    list_filter  = ["relationship", "id_verified"]