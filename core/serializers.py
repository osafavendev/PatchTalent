from rest_framework import serializers
from .models import Job, JobApplication, Conversation, ChatMessage
import os
MIN_COVER_LETTER_LENGTH = 30
MAX_COVER_LETTER_LENGTH = 4000
MAX_CHAT_MESSAGE_LENGTH = 3000
MAX_CHAT_ATTACHMENT_SIZE = 10 * 1024 * 1024
MAX_CV_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_CV_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}


def _validate_cv_file(file_obj):
    if not file_obj:
        return file_obj
    extension = os.path.splitext((getattr(file_obj, "name", "") or ""))[1].lower()
    if extension not in ALLOWED_CV_EXTENSIONS:
        raise serializers.ValidationError("CV must be one of: PDF, DOC, DOCX, or TXT.")
    if getattr(file_obj, "size", 0) > MAX_CV_FILE_SIZE:
        raise serializers.ValidationError("CV cannot exceed 10MB.")
    return file_obj

class JobSerializer(serializers.ModelSerializer):
    created_by_id = serializers.IntegerField(source='created_by.id', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    has_applied = serializers.SerializerMethodField(read_only=True)
    user_cover_letter = serializers.SerializerMethodField(read_only=True)
    user_cv = serializers.SerializerMethodField(read_only=True)
    match_score = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Job
        exclude = ('created_by',)
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        job_type = data.get('job_type', getattr(self.instance, 'job_type', None))
        location = data.get('job_location', getattr(self.instance, 'job_location', None))

        if job_type == Job.REMOTE and location:
            raise serializers.ValidationError("Remote jobs cannot have a location.")
        if job_type in [Job.HYBRID, Job.ONSITE] and not location:
            raise serializers.ValidationError("Hybrid/On-site jobs must have a location.")
        return data
    def get_has_applied(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user.is_hr:
            return False
        return obj.applications.filter(applicant=request.user).exists()

    def get_user_cover_letter(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user.is_hr:
            return None
        application = obj.applications.filter(applicant=request.user).first()
        return application.cover_letter if application else None

    def get_user_cv(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user.is_hr:
            return None
        application = obj.applications.filter(applicant=request.user).first()
        if not application or not application.cv:
            return None
        return request.build_absolute_uri(application.cv.url)

    def get_match_score(self, obj):
        match_scores = self.context.get("match_scores") or {}
        score = match_scores.get(obj.id)
        if score is None:
            return None
        return score


class JobApplicationSerializer(serializers.ModelSerializer):
    cv = serializers.FileField(required=False, allow_null=True)
    applicant_id = serializers.IntegerField(source='applicant.id', read_only=True)
    applicant_email = serializers.EmailField(source='applicant.email', read_only=True)
    applicant_username = serializers.CharField(source='applicant.username', read_only=True)
    proposal_score = serializers.SerializerMethodField(read_only=True)
    proposal_percentage = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = JobApplication
        fields = [
            'id',
            'job',
            'applicant_id',
            'applicant_email',
            'applicant_username',
            'cover_letter',
            'cv',
            'proposal_score',
            'proposal_percentage',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'job',
            'applicant_id',
            'applicant_email',
            'applicant_username',
            'proposal_score',
            'proposal_percentage',
            'created_at',
        ]
        extra_kwargs = {
            'cover_letter': {'required': True, 'allow_blank': False, 'max_length': MAX_COVER_LETTER_LENGTH},
        }

    def get_proposal_score(self, obj):
        proposal_scores = self.context.get("proposal_scores") or {}
        score = proposal_scores.get(obj.id)
        if score is None:
            return None
        return round(float(score), 4)

    def get_proposal_percentage(self, obj):
        score = self.get_proposal_score(obj)
        if score is None:
            return None
        return round(score * 100)

    def validate_cover_letter(self, value):
        cover_letter = value.strip()
        if not cover_letter:
            raise serializers.ValidationError("Cover letter is required.")
        if len(cover_letter) < MIN_COVER_LETTER_LENGTH:
            raise serializers.ValidationError(
                f"Cover letter must be at least {MIN_COVER_LETTER_LENGTH} characters."
            )
        if len(cover_letter) > MAX_COVER_LETTER_LENGTH:
            raise serializers.ValidationError(
                f"Cover letter cannot exceed {MAX_COVER_LETTER_LENGTH} characters."
            )
        return cover_letter

    def validate_cv(self, value):
        return _validate_cv_file(value)

    def validate(self, attrs):
        cv = attrs.get("cv")
        existing_cv = getattr(self.instance, "cv", None) if self.instance else None

        if self.instance is None and not cv:
            raise serializers.ValidationError({"cv": "CV is required."})

        if self.instance is not None and not existing_cv and not cv:
            raise serializers.ValidationError({"cv": "CV is required."})

        return attrs


class ConversationSerializer(serializers.ModelSerializer):
    hr_id = serializers.IntegerField(source='hr.id', read_only=True)
    hr_username = serializers.CharField(source='hr.username', read_only=True)
    candidate_id = serializers.IntegerField(source='candidate.id', read_only=True)
    candidate_username = serializers.CharField(source='candidate.username', read_only=True)
    other_user_id = serializers.SerializerMethodField(read_only=True)
    other_user_username = serializers.SerializerMethodField(read_only=True)
    other_user_is_hr = serializers.SerializerMethodField(read_only=True)
    last_message = serializers.SerializerMethodField(read_only=True)
    last_message_at = serializers.SerializerMethodField(read_only=True)
    unread_count = serializers.SerializerMethodField(read_only=True)
    hr_last_seen_at = serializers.DateTimeField(read_only=True)
    candidate_last_seen_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id',
            'hr_id',
            'hr_username',
            'candidate_id',
            'candidate_username',
            'other_user_id',
            'other_user_username',
            'other_user_is_hr',
            'last_message',
            'last_message_at',
            'unread_count',
            'hr_last_seen_at',
            'candidate_last_seen_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def _get_last_message_values(self, obj):
        text = getattr(obj, "last_message_text", None)
        attachment_name_or_path = getattr(obj, "last_message_attachment", None)
        created_at = getattr(obj, "last_message_created_at", None)

        if text is not None or attachment_name_or_path is not None or created_at is not None:
            return text, attachment_name_or_path, created_at

        last_message = getattr(obj, "_cached_last_message", None)
        if last_message is None:
            last_message = obj.messages.order_by("-created_at").first()
            obj._cached_last_message = last_message
        if not last_message:
            return None, None, None

        attachment_name_or_path = (
            last_message.attachment.name if getattr(last_message, "attachment", None) else None
        )
        return last_message.text, attachment_name_or_path, last_message.created_at

    def get_other_user_id(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        return obj.candidate.id if request.user.is_hr else obj.hr.id

    def get_other_user_username(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        return obj.candidate.username if request.user.is_hr else obj.hr.username

    def get_other_user_is_hr(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        return False if request.user.is_hr else True

    def get_last_message(self, obj):
        text, attachment_name_or_path, _ = self._get_last_message_values(obj)
        if text:
            return text
        if attachment_name_or_path:
            return f"📎 {os.path.basename(attachment_name_or_path)}"
        return None

    def get_last_message_at(self, obj):
        _, _, created_at = self._get_last_message_values(obj)
        return created_at

    def get_unread_count(self, obj):
        unread_count_annotated = getattr(obj, "unread_count_annotated", None)
        if unread_count_annotated is not None:
            return int(unread_count_annotated)
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        return obj.unread_count_for_user(request.user)


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    attachment_url = serializers.SerializerMethodField(read_only=True)
    attachment_name = serializers.SerializerMethodField(read_only=True)
    attachment_size = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'conversation',
            'sender_id',
            'sender_username',
            'text',
            'attachment_url',
            'attachment_name',
            'attachment_size',
            'created_at',
        ]
        read_only_fields = ['id', 'conversation', 'sender_id', 'sender_username', 'created_at']
    def get_attachment_url(self, obj):
        if not obj.attachment:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.attachment.url)
        return obj.attachment.url

    def get_attachment_name(self, obj):
        if not obj.attachment:
            return None
        return os.path.basename(obj.attachment.name)

    def get_attachment_size(self, obj):
        if not obj.attachment:
            return None
        try:
            return obj.attachment.size
        except Exception:
            return None


class ChatMessageCreateSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, max_length=MAX_CHAT_MESSAGE_LENGTH)
    attachment = serializers.FileField(required=False, allow_null=True)

    def validate_text(self, value):
        return (value or "").strip()

    def validate(self, attrs):
        text = (attrs.get("text") or "").strip()
        attachment = attrs.get("attachment")

        if not text and not attachment:
            raise serializers.ValidationError("Message cannot be empty.")
        if len(text) > MAX_CHAT_MESSAGE_LENGTH:
            raise serializers.ValidationError(
                f"Message cannot exceed {MAX_CHAT_MESSAGE_LENGTH} characters."
            )
        if attachment and getattr(attachment, "size", 0) > MAX_CHAT_ATTACHMENT_SIZE:
            raise serializers.ValidationError(
                {"attachment": f"Attachment cannot exceed {MAX_CHAT_ATTACHMENT_SIZE // (1024 * 1024)}MB."}
            )

        attrs["text"] = text
        return attrs
