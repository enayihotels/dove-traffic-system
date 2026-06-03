from rest_framework import generics, permissions, status
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
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
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


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """
    Allow any authenticated user to change their own password.
    Requires: current_password, new_password
    """
    user = request.user
    current_password = request.data.get("current_password", "")
    new_password     = request.data.get("new_password", "")

    if not current_password or not new_password:
        return Response(
            {"detail": "Both current_password and new_password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(current_password):
        return Response(
            {"detail": "Current password is incorrect."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(new_password) < 8:
        return Response(
            {"detail": "New password must be at least 8 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return Response({"detail": "Password changed successfully."})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def admin_create_parent(request):
    """
    Staff-only: create a parent account with a temporary password.
    The parent will be required to change it on first login.
    """
    if not request.user.is_school_staff:
        return Response({"detail": "Not authorised."}, status=status.HTTP_403_FORBIDDEN)

    email      = request.data.get("email")
    first_name = request.data.get("first_name")
    last_name  = request.data.get("last_name")
    phone      = request.data.get("phone", "")
    temp_pass  = request.data.get("temp_password")

    if not all([email, first_name, last_name, temp_pass]):
        return Response(
            {"detail": "email, first_name, last_name, and temp_password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email=email).exists():
        return Response({"detail": "A user with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        email=email,
        password=temp_pass,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        role="parent",
    )
    # Mark that password must be changed on next login
    user.is_active = True
    user.save()

    ParentProfile.objects.get_or_create(user=user)

    return Response(
        {
            "detail": "Parent account created successfully.",
            "user": {
                "id":         str(user.id),
                "email":      user.email,
                "full_name":  user.full_name,
                "role":       user.role,
            }
        },
        status=status.HTTP_201_CREATED,
    )
