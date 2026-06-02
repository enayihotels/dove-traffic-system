from django.urls import path
from . import views

urlpatterns = [
    path("chat/",              views.ai_chat),
    path("predict/<uuid:pk>/", views.ai_predict),
    path("report/<uuid:pk>/",  views.ai_report),
    path("insights/",          views.ai_insights),
]