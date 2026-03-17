from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'confirm_password', "is_hr")
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def validate(self, attrs):
        
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user
