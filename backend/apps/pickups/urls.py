from django.urls import path
from . import views

urlpatterns = [
    path("sessions/",                    views.SessionListView.as_view()),
    path("sessions/<uuid:pk>/",          views.SessionDetailView.as_view()),
    path("sessions/<uuid:pk>/open/",     views.session_open),
    path("sessions/<uuid:pk>/activate/", views.session_activate),
    path("sessions/<uuid:pk>/close/",    views.session_close),
    path("requests/",                    views.RequestListView.as_view()),
    path("requests/<uuid:pk>/call/",     views.call_children),
    path("requests/<uuid:pk>/complete/", views.complete_pickup),
    path("events/",                      views.EventListView.as_view()),
    path("requests/<uuid:pk>/verify/",   views.verify_qr),
]