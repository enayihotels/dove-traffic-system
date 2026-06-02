from rest_framework import serializers
from .models import YearGroup, SchoolClass, Student, AuthorisedCollector


class YearGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model  = YearGroup
        fields = "__all__"


class SchoolClassSerializer(serializers.ModelSerializer):
    year_group_name   = serializers.CharField(source="year_group.display_name", read_only=True)
    year_group_colour = serializers.CharField(source="year_group.colour_hex",   read_only=True)
    session_type      = serializers.CharField(source="year_group.session_type", read_only=True)
    student_count     = serializers.SerializerMethodField()

    class Meta:
        model  = SchoolClass
        fields = "__all__"

    def get_student_count(self, obj):
        return obj.students.filter(is_active=True).count()


class StudentSerializer(serializers.ModelSerializer):
    full_name         = serializers.ReadOnlyField()
    class_name        = serializers.CharField(source="school_class.name",                  read_only=True)
    year_group_name   = serializers.CharField(source="school_class.year_group.display_name", read_only=True)
    year_group_colour = serializers.CharField(source="school_class.year_group.colour_hex",   read_only=True)
    session_type      = serializers.CharField(source="school_class.year_group.session_type", read_only=True)

    class Meta:
        model  = Student
        fields = [
            "id", "first_name", "last_name", "full_name", "pupil_reference",
            "school_class", "class_name", "year_group_name", "year_group_colour",
            "session_type", "photo", "is_active", "safe_word", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AuthorisedCollectorSerializer(serializers.ModelSerializer):
    collector_name = serializers.CharField(source="user.full_name",  read_only=True)
    student_name   = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model        = AuthorisedCollector
        fields       = "__all__"
        read_only_fields = ["verified_by", "verified_at"]