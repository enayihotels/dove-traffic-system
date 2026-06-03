from django.urls import path
from . import views
from .views import EmailLoginView

urlpatterns = [
    path("register/",       views.RegisterView.as_view()),
    path("me/",             views.MeView.as_view()),
    path("users/",          views.UserListView.as_view()),
    path("fcm/",            views.update_fcm),
    path("parent-profile/", views.ParentProfileView.as_view()),
    path("login/", EmailLoginView.as_view(), name="email_login"),
]