# from rest_framework import serializers
# from django.contrib.auth import get_user_model
# from .models import ParentProfile

# User = get_user_model()


# class UserSerializer(serializers.ModelSerializer):
#     full_name       = serializers.ReadOnlyField()
#     is_school_staff = serializers.ReadOnlyField()

#     class Meta:
#         model  = User
#         fields = [
#             "id", "email", "first_name", "last_name", "full_name",
#             "role", "is_school_staff", "phone", "avatar",
#             "is_active", "date_joined", "last_seen",
#         ]
#         read_only_fields = ["id", "date_joined", "last_seen"]


# class RegisterSerializer(serializers.ModelSerializer):
#     password  = serializers.CharField(write_only=True, min_length=8)
#     password2 = serializers.CharField(write_only=True)

#     class Meta:
#         model  = User
#         fields = ["email", "first_name", "last_name", "phone", "role", "password", "password2"]

#     def validate(self, attrs):
#         if attrs["password"] != attrs.pop("password2"):
#             raise serializers.ValidationError({"password": "Passwords do not match."})
#         return attrs

#     def create(self, validated_data):
#         return User.objects.create_user(**validated_data)


# class ParentProfileSerializer(serializers.ModelSerializer):
#     class Meta:
#         model        = ParentProfile
#         fields       = "__all__"
#         read_only_fields = ["user", "created_at"]

from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ParentProfile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = "__all__"


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "password", "first_name", "last_name", "role"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ParentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentProfile
        fields = "__all__"


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    username_field = "email"
    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password")

        user = authenticate(
            username=user.email,
            password=password
        )

        if not user:
            raise serializers.ValidationError("Invalid email or password")

        refresh = RefreshToken.for_user(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.email,
                "email": user.email,
            }
        }