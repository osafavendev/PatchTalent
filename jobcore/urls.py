from django.urls import path

from .views import (
    CandidateProfileForHRDetailView,
    CandidateProfileMeView,
    CompanyProfileMeView,
    ExperienceDetailView,
    ExperienceListCreateView,
    ProjectDetailView,
    ProjectListCreateView,
)

urlpatterns = [
    path("me/", CandidateProfileMeView.as_view(), name="candidate-profile-me"),
    path("candidates/<int:user_id>/", CandidateProfileForHRDetailView.as_view(), name="candidate-profile-hr-detail"),
    path("company/", CompanyProfileMeView.as_view(), name="company-profile-me"),
    path("experiences/", ExperienceListCreateView.as_view(), name="experience-list-create"),
    path("experiences/<int:pk>/", ExperienceDetailView.as_view(), name="experience-detail"),
    path("projects/", ProjectListCreateView.as_view(), name="project-list-create"),
    path("projects/<int:pk>/", ProjectDetailView.as_view(), name="project-detail"),
]
