from django.contrib import admin
from .models import Job, JobApplication, Conversation, ChatMessage
# Register your models here.
admin.site.register(Job)
admin.site.register(JobApplication)
admin.site.register(Conversation)
admin.site.register(ChatMessage)
