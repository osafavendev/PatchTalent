from django.db import models
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone


class Job(models.Model):
    REMOTE = 'remote'
    HYBRID = 'hybrid'
    ONSITE = 'onsite'

    JOB_TYPE_CHOICES = [
        (REMOTE, 'Remote'),
        (HYBRID, 'Hybrid'),
        (ONSITE, 'On-site'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    job_type = models.CharField(max_length=10, choices=JOB_TYPE_CHOICES)
    job_location = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='jobs'
    )

    def save(self, *args, **kwargs):
        if self._state.adding:  # Only on CREATE
            if not self.created_by.is_hr:
                raise PermissionDenied("Only HR users can create jobs.")

        # Business rule
        if self.job_type == self.REMOTE:
            self.job_location = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.job_type})"

class JobApplication(models.Model):
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='applications'
    )
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='job_applications'
    )
    cover_letter = models.TextField(blank=True)
    cv = models.FileField(upload_to='applications/cvs/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['job', 'applicant'],
                name='unique_job_application'
            )
        ]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['job', 'created_at'], name='jobapp_job_created_idx'),
            models.Index(fields=['applicant', 'created_at'], name='jobapp_app_created_idx'),
        ]

    def clean(self):
        if self.applicant and self.applicant.is_hr:
            raise ValidationError("HR users cannot apply for jobs.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.applicant.email} -> {self.job.title}"

class JobMatchResult(models.Model):
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="match_results",
    )
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_match_results",
    )
    score = models.FloatField(default=0.0)
    engine_version = models.CharField(max_length=32, default="legacy")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["job", "candidate"],
                name="unique_job_match_result",
            )
        ]
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["candidate", "engine_version"], name="jobmatch_cand_eng_idx"),
        ]

    def clean(self):
        if self.candidate and self.candidate.is_hr:
            raise ValidationError("Only normal users can have job match results.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Match<{self.candidate.email} -> {self.job.title}: {self.score}>"


class Conversation(models.Model):
    hr = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hr_conversations',
    )
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='candidate_conversations',
    )
    hr_last_seen_at = models.DateTimeField(null=True, blank=True)
    candidate_last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['hr', 'candidate'],
                name='unique_hr_candidate_conversation'
            )
        ]
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['hr', 'updated_at'], name='conv_hr_upd_idx'),
            models.Index(fields=['candidate', 'updated_at'], name='conv_cand_upd_idx'),
        ]

    def clean(self):
        if self.hr and not self.hr.is_hr:
            raise ValidationError("Conversation HR participant must be an HR user.")
        if self.candidate and self.candidate.is_hr:
            raise ValidationError("Conversation candidate participant must be a normal user.")
        if self.hr_id and self.candidate_id and self.hr_id == self.candidate_id:
            raise ValidationError("Conversation participants must be different users.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def mark_seen(self, user):
        now = timezone.now()
        if user.id == self.hr_id:
            Conversation.objects.filter(id=self.id).update(hr_last_seen_at=now)
            self.hr_last_seen_at = now
        elif user.id == self.candidate_id:
            Conversation.objects.filter(id=self.id).update(candidate_last_seen_at=now)
            self.candidate_last_seen_at = now
        return now

    def unread_count_for_user(self, user):
        if user.id == self.hr_id:
            last_seen_at = self.hr_last_seen_at
        elif user.id == self.candidate_id:
            last_seen_at = self.candidate_last_seen_at
        else:
            return 0

        unread_messages = self.messages.exclude(sender_id=user.id)
        if last_seen_at:
            unread_messages = unread_messages.filter(created_at__gt=last_seen_at)
        return unread_messages.count()

    def __str__(self):
        return f"Conversation<{self.hr.email} ↔ {self.candidate.email}>"


class ChatMessage(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_messages',
    )
    text = models.TextField(blank=True)
    attachment = models.FileField(upload_to='chat/attachments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at'], name='chatmsg_conv_created_idx'),
            models.Index(fields=['conversation', 'sender', 'created_at'], name='chatmsg_conv_sender_idx'),
        ]

    def clean(self):
        if self.conversation_id and self.sender_id:
            if self.sender_id not in [self.conversation.hr_id, self.conversation.candidate_id]:
                raise ValidationError("Sender must be a participant in the conversation.")
        text_content = (self.text or "").strip()
        if not text_content and not self.attachment:
            raise ValidationError("Message must contain text or an attachment.")

    def save(self, *args, **kwargs):
        self.text = (self.text or "").strip()
        self.full_clean()
        super().save(*args, **kwargs)
        Conversation.objects.filter(id=self.conversation_id).update(updated_at=self.created_at)

    def __str__(self):
        return f"Message<{self.sender.email} @ {self.created_at}>"
