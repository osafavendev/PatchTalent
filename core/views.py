from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from django.db.models import Count, F, OuterRef, Q, Subquery

from core.pagination import JobPagination
from .recommendation import (
    get_match_engine_version,
    invalidate_candidate_match_cache,
    match_job_for_candidate,
    rank_applications_for_job,
)
from .chat_events import broadcast_conversation_update
from .chat_events import broadcast_chat_message, broadcast_message_seen
from .models import Job, JobApplication, JobMatchResult, Conversation, ChatMessage
from .serializers import (
    JobSerializer,
    JobApplicationSerializer,
    ConversationSerializer,
    ChatMessageSerializer,
    ChatMessageCreateSerializer,
)

class JobCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_hr:
            return Response(
                {"detail": "Only HR users can create jobs."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = JobSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class JobListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search_query = request.GET.get("search", "")
        role_query = (request.GET.get("role") or "").strip()
        location_query = (request.GET.get("location") or "").strip()
        job_type_query = (request.GET.get("job_type") or "").strip().lower()
        valid_job_types = {Job.REMOTE, Job.HYBRID, Job.ONSITE}
        match_scores = {}
        
        if request.user.is_hr:
            jobs = Job.objects.filter(created_by=request.user).order_by("-created_at")
        else:
            jobs = Job.objects.all().order_by("-created_at")
        
        if search_query:
            jobs = jobs.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(job_location__icontains=search_query)
            )
        if role_query:
            normalized_role = role_query.lower()
            role_filter = (
                Q(title__icontains=role_query)
                | Q(description__icontains=role_query)
            )
            if normalized_role in valid_job_types:
                role_filter = role_filter | Q(job_type=normalized_role)
            jobs = jobs.filter(role_filter)
        if location_query:
            normalized_location = location_query.lower()
            location_filter = Q(job_location__icontains=location_query)
            if normalized_location in valid_job_types:
                location_filter = location_filter | Q(job_type=normalized_location)
            jobs = jobs.filter(location_filter)
        if job_type_query in valid_job_types:
            jobs = jobs.filter(job_type=job_type_query)
        paginator = JobPagination()
        paginated_jobs = paginator.paginate_queryset(jobs, request)
        if not request.user.is_hr:
            job_ids = [job.id for job in paginated_jobs]
            current_engine_version = get_match_engine_version()
            saved_matches = JobMatchResult.objects.filter(
                candidate=request.user,
                job_id__in=job_ids,
                engine_version=current_engine_version,
            )
            match_scores = {match.job_id: round(float(match.score), 4) for match in saved_matches}
        serializer = JobSerializer(
            paginated_jobs,
            many=True,
            context={"request": request, "match_scores": match_scores},
        )
        return paginator.get_paginated_response(serializer.data)
class JobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Job.objects.get(pk=pk)  
        except Job.DoesNotExist:
            return None

    def get(self, request, pk):
        job = self.get_object(pk)
        if not job:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = JobSerializer(job, context={"request": request})
        return Response(serializer.data)

    def put(self, request, pk):
        if not request.user.is_hr:
            return Response({"detail": "Only HR can edit jobs."}, status=status.HTTP_403_FORBIDDEN)
        job = Job.objects.filter(pk=pk, created_by=request.user).first()
        if not job:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = JobSerializer(job, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(JobSerializer(job, context={"request": request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_hr:
            return Response({"detail": "Only HR can delete jobs."}, status=status.HTTP_403_FORBIDDEN)
        job = Job.objects.filter(pk=pk, created_by=request.user).first()
        if not job:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        job.delete()
        return Response({"detail": "Job deleted."}, status=status.HTTP_204_NO_CONTENT)

class JobApplyView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot apply for jobs."},
                status=status.HTTP_403_FORBIDDEN
            )

        job = Job.objects.filter(pk=pk).first()
        if not job:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        if JobApplication.objects.filter(job=job, applicant=request.user).exists():
            return Response(
                {"detail": "You have already applied for this job. You can update your cover letter."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = JobApplicationSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            application = serializer.save(job=job, applicant=request.user)
            invalidate_candidate_match_cache(request.user.id)
            output = JobApplicationSerializer(application, context={"request": request})
            return Response(output.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        if request.user.is_hr:
            return Response(
                {"detail": "HR users cannot apply for jobs."},
                status=status.HTTP_403_FORBIDDEN
            )

        job = Job.objects.filter(pk=pk).first()
        if not job:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

        application = JobApplication.objects.filter(job=job, applicant=request.user).first()
        if not application:
            return Response(
                {"detail": "You have not applied for this job yet."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = JobApplicationSerializer(
            application,
            data=request.data,
            partial=False,
            context={"request": request}
        )
        if serializer.is_valid():
            updated_application = serializer.save()
            invalidate_candidate_match_cache(request.user.id)
            output = JobApplicationSerializer(updated_application, context={"request": request})
            return Response(output.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class JobMatchScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.is_hr:
            return Response(
                {"detail": "Only normal users can match jobs to CV."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = Job.objects.filter(pk=pk).first()
        if not job:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        current_engine_version = get_match_engine_version()
        saved_match = JobMatchResult.objects.filter(job=job, candidate=request.user).first()
        if saved_match and saved_match.engine_version == current_engine_version:
            match_score = round(float(saved_match.score), 4)
            return Response(
                {
                    "job_id": job.id,
                    "match_score": match_score,
                    "match_percentage": round(match_score * 100),
                    "is_saved": True,
                },
                status=status.HTTP_200_OK,
            )

        match_score = match_job_for_candidate(request.user, job)
        JobMatchResult.objects.update_or_create(
            job=job,
            candidate=request.user,
            defaults={"score": match_score, "engine_version": current_engine_version},
        )
        return Response(
            {
                "job_id": job.id,
                "match_score": match_score,
                "match_percentage": round(match_score * 100),
                "is_saved": False,
            },
            status=status.HTTP_200_OK,
        )


class JobApplicantsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not request.user.is_hr:
            return Response(
                {"detail": "Only HR users can view applicants."},
                status=status.HTTP_403_FORBIDDEN
            )

        job = Job.objects.filter(pk=pk, created_by=request.user).first()
        if not job:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        sort_mode = (request.GET.get("sort") or "recent").strip().lower()
        applications_queryset = (
            JobApplication.objects.filter(job=job)
            .select_related("applicant")
            .order_by("-created_at")
        )
        applications = list(applications_queryset)
        proposal_scores = {}

        if sort_mode == "proposal":
            proposal_scores = rank_applications_for_job(job, applications)
            applications.sort(
                key=lambda application: (
                    proposal_scores.get(application.id, 0.0),
                    application.created_at,
                ),
                reverse=True,
            )

        serializer = JobApplicationSerializer(
            applications,
            many=True,
            context={"request": request, "proposal_scores": proposal_scores},
        )
        serialized_data = list(serializer.data)
        if sort_mode == "proposal":
            for index, item in enumerate(serialized_data, start=1):
                item["proposal_rank"] = index

        return Response(serialized_data, status=status.HTTP_200_OK)


class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        last_message_subquery = ChatMessage.objects.filter(
            conversation_id=OuterRef("pk")
        ).order_by("-created_at")
        if request.user.is_hr:
            unread_filter = (
                ~Q(messages__sender=request.user)
                & (
                    Q(hr_last_seen_at__isnull=True)
                    | Q(messages__created_at__gt=F("hr_last_seen_at"))
                )
            )
            conversations = Conversation.objects.filter(hr=request.user).select_related('hr', 'candidate')
        else:
            unread_filter = (
                ~Q(messages__sender=request.user)
                & (
                    Q(candidate_last_seen_at__isnull=True)
                    | Q(messages__created_at__gt=F("candidate_last_seen_at"))
                )
            )
            conversations = Conversation.objects.filter(candidate=request.user).select_related('hr', 'candidate')

        conversations = conversations.annotate(
            unread_count_annotated=Count("messages", filter=unread_filter),
            last_message_text=Subquery(last_message_subquery.values("text")[:1]),
            last_message_attachment=Subquery(last_message_subquery.values("attachment")[:1]),
            last_message_created_at=Subquery(last_message_subquery.values("created_at")[:1]),
        )
        serializer = ConversationSerializer(conversations, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ConversationStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_id = request.data.get("user_id")
        if not target_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        target = User.objects.filter(id=target_id).first()
        if not target:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        current_user = request.user
        if target.id == current_user.id:
            return Response(
                {"detail": "You cannot start a conversation with yourself."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if target.is_hr == current_user.is_hr:
            return Response(
                {"detail": "Conversation is allowed only between an HR user and a normal user."},
                status=status.HTTP_400_BAD_REQUEST
            )

        hr_user = current_user if current_user.is_hr else target
        candidate_user = target if current_user.is_hr else current_user
        conversation, _ = Conversation.objects.get_or_create(hr=hr_user, candidate=candidate_user)
        conversation.mark_seen(current_user)
        broadcast_conversation_update(conversation)
        serializer = ConversationSerializer(conversation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_conversation(self, request, conversation_id):
        return Conversation.objects.filter(
            id=conversation_id
        ).filter(
            Q(hr=request.user) | Q(candidate=request.user)
        ).select_related('hr', 'candidate').first()

    def get(self, request, conversation_id):
        conversation = self.get_conversation(request, conversation_id)
        if not conversation:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
        conversation.mark_seen(request.user)
        broadcast_conversation_update(conversation)
        broadcast_message_seen(conversation, request.user)
        messages = ChatMessage.objects.filter(conversation=conversation).select_related('sender')
        serializer = ChatMessageSerializer(messages, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, conversation_id):
        conversation = self.get_conversation(request, conversation_id)
        if not conversation:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ChatMessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            text=serializer.validated_data.get("text", ""),
            attachment=serializer.validated_data.get("attachment"),
        )
        conversation.mark_seen(request.user)
        broadcast_conversation_update(conversation)
        broadcast_message_seen(conversation, request.user)
        broadcast_chat_message(message)
        output = ChatMessageSerializer(message, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)
