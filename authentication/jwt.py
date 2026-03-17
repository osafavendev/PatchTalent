from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from rest_framework import serializers


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['is_hr'] = user.is_hr
        token['email'] = user.email
        token['username'] = user.username
        return token

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        user = authenticate(email=email, password=password)

        if not user:
            raise serializers.ValidationError("Invalid email or password")

        data = super().validate(attrs)

        # ✅ add user data to response
        data['email'] = user.email
        data['username'] = user.username
        data['is_hr'] = user.is_hr

        return data
