from django.urls import path
from .views import RegisterView, EmailLoginView, CheckAuthView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', EmailLoginView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('check-auth/', CheckAuthView.as_view()),  
]
