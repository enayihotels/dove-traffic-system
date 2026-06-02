from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import YearGroup, SchoolClass, Student, AuthorisedCollector
from .serializers import (
    YearGroupSerializer, SchoolClassSerializer,
    StudentSerializer, AuthorisedCollectorSerializer,
)


class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_school_staff


class YearGroupListView(generics.ListCreateAPIView):
    queryset           = YearGroup.objects.all()
    serializer_class   = YearGroupSerializer
    permission_classes = [permissions.IsAuthenticated]


class SchoolClassListView(generics.ListCreateAPIView):
    serializer_class   = SchoolClassSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["year_group", "is_active"]

    def get_queryset(self):
        return SchoolClass.objects.filter(is_active=True).select_related("year_group", "teacher")


class StudentListView(generics.ListCreateAPIView):
    serializer_class   = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["school_class", "is_active"]
    search_fields      = ["first_name", "last_name", "pupil_reference"]

    def get_queryset(self):
        u    = self.request.user
        base = Student.objects.select_related("school_class", "school_class__year_group")
        if u.is_school_staff:
            return base.filter(is_active=True)
        authorised = AuthorisedCollector.objects.filter(user=u).values_list("student_id", flat=True)
        return base.filter(id__in=authorised, is_active=True)


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = StudentSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        return Student.objects.select_related("school_class", "school_class__year_group")


class CollectorListView(generics.ListCreateAPIView):
    serializer_class   = AuthorisedCollectorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        if u.is_school_staff:
            return AuthorisedCollector.objects.select_related("user", "student")
        return AuthorisedCollector.objects.filter(user=u).select_related("student")