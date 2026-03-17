from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from core.recommendation import invalidate_candidate_match_cache

from .models import CandidateProfile, CompanyProfile, Experience, Project
from .serializers import (
    CandidateProfileSerializer,
    CandidateProfileUpdateSerializer,
    CompanyProfileSerializer,
    ExperienceSerializer,
    ProjectSerializer,
)


class CandidateProfileMeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_profile(self, user):
        return CandidateProfile.objects.get_or_create(user=user)[0]

    def get(self, request):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot use candidate profile endpoints."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = self.get_profile(request.user)
        serializer = CandidateProfileSerializer(profile, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot use candidate profile endpoints."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = self.get_profile(request.user)
        serializer = CandidateProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            invalidate_candidate_match_cache(request.user.id)
            return Response(
                CandidateProfileSerializer(profile, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CompanyProfileMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get_profile(self, user):
        return CompanyProfile.objects.get_or_create(user=user)[0]

    def get(self, request):
        if not request.user.is_hr:
            return Response(
                {"detail": "Only HR users can use company profile endpoints."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = self.get_profile(request.user)
        serializer = CompanyProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        if not request.user.is_hr:
            return Response(
                {"detail": "Only HR users can use company profile endpoints."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = self.get_profile(request.user)
        serializer = CompanyProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExperienceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_profile(self, user):
        return CandidateProfile.objects.get_or_create(user=user)[0]

    def get(self, request):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot manage candidate experiences."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = self.get_profile(request.user)
        experiences = profile.experiences.all()
        serializer = ExperienceSerializer(experiences, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot manage candidate experiences."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = self.get_profile(request.user)
        serializer = ExperienceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profile=profile)
            invalidate_candidate_match_cache(request.user.id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExperienceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, user, pk):
        if user.is_hr:
            return None
        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        return Experience.objects.filter(pk=pk, profile=profile).first()

    def put(self, request, pk):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot manage candidate experiences."},
                status=status.HTTP_403_FORBIDDEN,
            )
        experience = self.get_object(request.user, pk)
        if not experience:
            return Response({"detail": "Experience not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ExperienceSerializer(experience, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            invalidate_candidate_match_cache(request.user.id)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot manage candidate experiences."},
                status=status.HTTP_403_FORBIDDEN,
            )
        experience = self.get_object(request.user, pk)
        if not experience:
            return Response({"detail": "Experience not found."}, status=status.HTTP_404_NOT_FOUND)
        experience.delete()
        invalidate_candidate_match_cache(request.user.id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_profile(self, user):
        return CandidateProfile.objects.get_or_create(user=user)[0]

    def get(self, request):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot manage candidate projects."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = self.get_profile(request.user)
        projects = profile.projects.all()
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot manage candidate projects."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = self.get_profile(request.user)
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid():
            project = serializer.save(profile=profile)
            invalidate_candidate_match_cache(request.user.id)
            return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, user, pk):
        if user.is_hr:
            return None
        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        return Project.objects.filter(pk=pk, profile=profile).first()

    def put(self, request, pk):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot manage candidate projects."},
                status=status.HTTP_403_FORBIDDEN,
            )
        project = self.get_object(request.user, pk)
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProjectSerializer(project, data=request.data, partial=True)
        if serializer.is_valid():
            updated_project = serializer.save()
            invalidate_candidate_match_cache(request.user.id)
            return Response(ProjectSerializer(updated_project).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot manage candidate projects."},
                status=status.HTTP_403_FORBIDDEN,
            )
        project = self.get_object(request.user, pk)
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        project.delete()
        invalidate_candidate_match_cache(request.user.id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CandidateProfileForHRDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        if not request.user.is_hr:
            return Response(
                {"detail": "Only HR users can view candidate profile details."},
                status=status.HTTP_403_FORBIDDEN,
            )

        User = get_user_model()
        candidate = User.objects.filter(id=user_id, is_hr=False).first()
        if not candidate:
            return Response({"detail": "Candidate not found."}, status=status.HTTP_404_NOT_FOUND)

        profile = CandidateProfile.objects.get_or_create(user=candidate)[0]
        serializer = CandidateProfileSerializer(profile, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
