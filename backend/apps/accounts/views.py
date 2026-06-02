from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from .serializers import UserSerializer, RegisterSerializer, ParentProfileSerializer
from .models import ParentProfile
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import EmailTokenObtainPairSerializer


class EmailLoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset         = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        user.last_seen = timezone.now()
        user.save(update_fields=["last_seen"])
        return user


class UserListView(generics.ListAPIView):
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        if u.is_school_staff:
            role = self.request.query_params.get("role")
            qs   = User.objects.filter(is_active=True)
            if role:
                qs = qs.filter(role=role)
            return qs
        return User.objects.filter(id=u.id)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def update_fcm(request):
    request.user.fcm_token = request.data.get("fcm_token", "")
    request.user.save(update_fields=["fcm_token"])
    return Response({"status": "ok"})


class ParentProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = ParentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = ParentProfile.objects.get_or_create(user=self.request.user)
        return profile