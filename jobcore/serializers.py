from rest_framework import serializers
from django.utils import timezone

from .models import (
    CandidateProfile,
    CompanyProfile,
    Experience,
    Project,
    ProjectScreenshot,
)

MAX_CV_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_CV_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}


def _validate_cv_file(file_obj):
    if not file_obj:
        return file_obj
    filename = (getattr(file_obj, "name", "") or "")
    extension = filename[filename.rfind("."):].lower() if "." in filename else ""
    if extension not in ALLOWED_CV_EXTENSIONS:
        raise serializers.ValidationError("CV must be one of: PDF, DOC, DOCX, or TXT.")
    if getattr(file_obj, "size", 0) > MAX_CV_FILE_SIZE:
        raise serializers.ValidationError("CV cannot exceed 10MB.")
    return file_obj


class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = [
            "id",
            "title",
            "company",
            "location",
            "start_date",
            "end_date",
            "is_current",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        is_current = attrs.get("is_current", getattr(self.instance, "is_current", False))

        if is_current and end_date:
            raise serializers.ValidationError({"end_date": "Current experience cannot have an end date."})
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})
        return attrs


class ProjectScreenshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectScreenshot
        fields = ["id", "image_url", "caption", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    screenshots = ProjectScreenshotSerializer(many=True, read_only=True)
    screenshot_urls = serializers.ListField(
        child=serializers.URLField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "project_url",
            "repo_url",
            "start_date",
            "end_date",
            "screenshots",
            "screenshot_urls",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "screenshots", "created_at", "updated_at"]

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "Project end date cannot be before start date."})
        return attrs

    def create(self, validated_data):
        screenshot_urls = validated_data.pop("screenshot_urls", [])
        project = Project.objects.create(**validated_data)
        if screenshot_urls:
            ProjectScreenshot.objects.bulk_create(
                [ProjectScreenshot(project=project, image_url=url) for url in screenshot_urls]
            )
        return project

    def update(self, instance, validated_data):
        screenshot_urls = validated_data.pop("screenshot_urls", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if screenshot_urls is not None:
            instance.screenshots.all().delete()
            if screenshot_urls:
                ProjectScreenshot.objects.bulk_create(
                    [ProjectScreenshot(project=instance, image_url=url) for url in screenshot_urls]
                )
        return instance


class CandidateProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    experiences = ExperienceSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    cv_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CandidateProfile
        fields = [
            "id",
            "user_email",
            "user_username",
            "headline",
            "about",
            "location",
            "linkedin_url",
            "github_url",
            "portfolio_url",
            "profile_picture_url",
            "cv_url",
            "experiences",
            "projects",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_email", "user_username", "experiences", "projects", "created_at", "updated_at"]

    def get_cv_url(self, obj):
        if not obj.cv:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.cv.url)
        return obj.cv.url


class CandidateProfileUpdateSerializer(serializers.ModelSerializer):
    cv = serializers.FileField(required=False, allow_null=True)
    class Meta:
        model = CandidateProfile
        fields = [
            "headline",
            "about",
            "location",
            "linkedin_url",
            "github_url",
            "portfolio_url",
            "profile_picture_url",
            "cv",
        ]

    def validate_cv(self, value):
        return _validate_cv_file(value)


class CompanyProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = CompanyProfile
        fields = [
            "id",
            "user_email",
            "user_username",
            "company_name",
            "about",
            "website",
            "industry",
            "company_size",
            "headquarters",
            "logo_url",
            "founded_year",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_email", "user_username", "created_at", "updated_at"]

    def validate_founded_year(self, value):
        if value is None:
            return value
        current_year = timezone.now().year
        if value < 1800:
            raise serializers.ValidationError("Founded year seems invalid.")
        if value > current_year:
            raise serializers.ValidationError("Founded year cannot be in the future.")
        return value
