from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .jwt import EmailTokenObtainPairSerializer
from rest_framework.permissions import AllowAny , IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            refresh = RefreshToken.for_user(user)
            refresh["is_hr"] = user.is_hr
            refresh["email"] = user.email
            refresh["username"] = user.username

            return Response(
                {
                    "email": user.email,
                    "username": user.username,
                    "is_hr":user.is_hr,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class EmailLoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class CheckAuthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "authenticated": True,
            "email": user.email,
            "username": user.username
        })