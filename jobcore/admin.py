from django.contrib import admin
from .models import CandidateProfile, CompanyProfile, Experience, Project, ProjectScreenshot

admin.site.register(CandidateProfile)
admin.site.register(CompanyProfile)
admin.site.register(Experience)
admin.site.register(Project)
admin.site.register(ProjectScreenshot)
