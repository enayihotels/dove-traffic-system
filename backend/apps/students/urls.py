from django.urls import path
from . import views

urlpatterns = [
    path("year-groups/",        views.YearGroupListView.as_view()),
    path("classes/",            views.SchoolClassListView.as_view()),
    path("",                    views.StudentListView.as_view()),
    path("<uuid:pk>/",          views.StudentDetailView.as_view()),
    path("collectors/",         views.CollectorListView.as_view()),
    path("collectors/<uuid:pk>/", views.CollectorDetailView.as_view()),  # ← NEW (for delete)
]
