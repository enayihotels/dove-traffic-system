"""Root URL configuration"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
   TokenRefreshView, TokenVerifyView,
)


admin.site.site_header='Doveland Admin'
admin.site.index_title='Admin'

def home(request):
    return HttpResponse("Doveland Traffic Management Backend is running.")

urlpatterns = [
    path("", home, name="home"),
    path("admin/",            admin.site.urls),
    # path("api/auth/login/",   TokenObtainPairView.as_view()),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/auth/refresh/", TokenRefreshView.as_view()),
    path("api/auth/verify/",  TokenVerifyView.as_view()),
    path("api/accounts/",     include("apps.accounts.urls")),
    path("api/students/",     include("apps.students.urls")),
    path("api/pickups/",      include("apps.pickups.urls")),
    path("api/location/",     include("apps.location.urls")),
    path("api/ai/",           include("apps.ai_engine.urls")),
    path("api/alerts/",       include("apps.alerts.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
