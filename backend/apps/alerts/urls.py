from django.urls import path
from . import views

urlpatterns = [
    path("",           views.NotifListView.as_view()),
    path("read-all/",  views.mark_all_read),
]