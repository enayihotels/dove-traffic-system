from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .models import ParentProfile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    # These are @property fields on the model — must be declared explicitly
    full_name       = serializers.ReadOnlyField()
    is_school_staff = serializers.ReadOnlyField()

    class Meta:
        model  = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "role", "is_school_staff", "phone", "avatar",
            "is_active", "date_joined", "last_seen",
        ]
        read_only_fields = ["id", "date_joined", "last_seen"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ["id", "email", "password", "first_name", "last_name", "role"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ParentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ParentProfile
        fields = "__all__"


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    username_field = "email"

    def validate(self, attrs):
        email    = attrs.get("email")
        password = attrs.get("password")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password")

        user = authenticate(username=user.email, password=password)

        if not user:
            raise serializers.ValidationError("Invalid email or password")

        refresh = RefreshToken.for_user(user)

        return {
            "refresh": str(refresh),
            "access":  str(refresh.access_token),
            "user": {
                "id":             str(user.id),
                "email":          user.email,
                "first_name":     user.first_name,
                "last_name":      user.last_name,
                "full_name":      user.full_name,
                "role":           user.role,
                "is_school_staff": user.is_school_staff,
            }
        }
