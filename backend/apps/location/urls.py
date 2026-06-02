from django.urls import path
from . import views

urlpatterns = [
    path("update/", views.update_location),
    path("zones/",  views.list_zones),
]