from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class CandidateProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidate_profile",
    )
    headline = models.CharField(max_length=255, blank=True)
    about = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    linkedin_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    profile_picture_url = models.URLField(blank=True)
    cv = models.FileField(upload_to="profiles/cvs/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CandidateProfile<{self.user.email}>"


class CompanyProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_profile",
    )
    company_name = models.CharField(max_length=255, blank=True)
    about = models.TextField(blank=True)
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=120, blank=True)
    company_size = models.CharField(max_length=80, blank=True)
    headquarters = models.CharField(max_length=255, blank=True)
    logo_url = models.URLField(blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CompanyProfile<{self.user.email}>"


class Experience(models.Model):
    profile = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name="experiences",
    )
    title = models.CharField(max_length=160)
    company = models.CharField(max_length=160)
    location = models.CharField(max_length=255, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_current", "-start_date", "-created_at"]

    def clean(self):
        if self.is_current and self.end_date:
            raise ValidationError("Current experience cannot have an end date.")
        if self.end_date and self.end_date < self.start_date:
            raise ValidationError("End date cannot be before start date.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} @ {self.company}"


class Project(models.Model):
    profile = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    project_url = models.URLField(blank=True)
    repo_url = models.URLField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError("Project end date cannot be before start date.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProjectScreenshot(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="screenshots",
    )
    image_url = models.URLField()
    caption = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Screenshot<{self.project.name}>"

