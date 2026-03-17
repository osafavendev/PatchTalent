import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ChatMessage, Conversation, Job, JobApplication, JobMatchResult
from .recommendation import get_match_engine_version

User = get_user_model()
TEMP_MEDIA_ROOT = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class JobApplicationCVRequirementTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.hr = User.objects.create_user(
            email="hr@example.com",
            username="hr",
            password="password123",
            is_hr=True,
        )
        self.candidate = User.objects.create_user(
            email="candidate@example.com",
            username="candidate",
            password="password123",
            is_hr=False,
        )
        self.job = Job.objects.create(
            title="Backend Engineer",
            description="Build and maintain APIs.",
            job_type=Job.REMOTE,
            created_by=self.hr,
        )
        self.apply_url = f"/api/jobs/{self.job.id}/apply/"
        self.valid_cover_letter = (
            "I am very interested in this role and have strong backend experience."
        )
        self.client.force_authenticate(user=self.candidate)

    def build_cv_file(self, filename="resume.pdf"):
        return SimpleUploadedFile(
            filename,
            b"%PDF-1.4 sample cv content",
            content_type="application/pdf",
        )

    def test_candidate_cannot_apply_without_cv(self):
        response = self.client.post(
            self.apply_url,
            {"cover_letter": self.valid_cover_letter},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["cv"][0], "CV is required.")

    def test_candidate_can_apply_with_cv(self):
        response = self.client.post(
            self.apply_url,
            {
                "cover_letter": self.valid_cover_letter,
                "cv": self.build_cv_file(),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            JobApplication.objects.filter(job=self.job, applicant=self.candidate).exists()
        )
        self.assertIn("/media/applications/cvs/", response.data["cv"])

    def test_candidate_cannot_update_application_without_existing_cv_and_no_new_cv(self):
        JobApplication.objects.create(
            job=self.job,
            applicant=self.candidate,
            cover_letter=self.valid_cover_letter,
        )

        response = self.client.put(
            self.apply_url,
            {"cover_letter": "Updated cover letter with enough meaningful detail."},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["cv"][0], "CV is required.")

    def test_candidate_can_update_cover_letter_without_new_cv_when_existing_cv_present(self):
        JobApplication.objects.create(
            job=self.job,
            applicant=self.candidate,
            cover_letter=self.valid_cover_letter,
            cv=self.build_cv_file("existing-resume.pdf"),
        )

        response = self.client.put(
            self.apply_url,
            {"cover_letter": "Updated cover letter that still satisfies minimum length."},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["cover_letter"],
            "Updated cover letter that still satisfies minimum length.",
        )

    def test_candidate_cannot_apply_with_invalid_cv_extension(self):
        response = self.client.post(
            self.apply_url,
            {
                "cover_letter": self.valid_cover_letter,
                "cv": SimpleUploadedFile(
                    "resume.exe",
                    b"not-a-cv",
                    content_type="application/octet-stream",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["cv"][0], "CV must be one of: PDF, DOC, DOCX, or TXT.")

    def test_candidate_cannot_apply_with_oversized_cv(self):
        response = self.client.post(
            self.apply_url,
            {
                "cover_letter": self.valid_cover_letter,
                "cv": SimpleUploadedFile(
                    "big-resume.pdf",
                    b"a" * (10 * 1024 * 1024 + 1),
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["cv"][0], "CV cannot exceed 10MB.")

@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class JobRecommendationTests(APITestCase):
    def setUp(self):
        self.hr = User.objects.create_user(
            email="hr-reco@example.com",
            username="hr_reco",
            password="password123",
            is_hr=True,
        )
        self.candidate = User.objects.create_user(
            email="candidate-reco@example.com",
            username="candidate_reco",
            password="password123",
            is_hr=False,
        )

        self.backend_job = Job.objects.create(
            title="Python Django Backend Engineer",
            description="Build REST APIs with Django, Python, PostgreSQL, and testing.",
            job_type=Job.REMOTE,
            created_by=self.hr,
        )
        self.design_job = Job.objects.create(
            title="Graphic Designer",
            description="Create posters, logos, and social media creative assets.",
            job_type=Job.REMOTE,
            created_by=self.hr,
        )
        self.sales_job = Job.objects.create(
            title="Enterprise Sales Executive",
            description="Lead outbound sales, close contracts, and manage customer pipeline.",
            job_type=Job.REMOTE,
            created_by=self.hr,
        )

        JobApplication.objects.create(
            job=self.sales_job,
            applicant=self.candidate,
            cover_letter="I enjoy backend development with python and django frameworks.",
            cv=SimpleUploadedFile(
                "cv.txt",
                b"python django rest api backend engineer sql testing microservices",
                content_type="text/plain",
            ),
        )

        self.list_url = "/api/jobs/"
        self.backend_match_url = f"/api/jobs/{self.backend_job.id}/match/"
        self.design_match_url = f"/api/jobs/{self.design_job.id}/match/"
    def _find_job(self, results, job_id):
        for item in results:
            if item["id"] == job_id:
                return item
        return None

    def test_candidate_can_request_on_demand_match_score_for_a_job(self):
        self.client.force_authenticate(user=self.candidate)
        response = self.client.get(self.backend_match_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["job_id"], self.backend_job.id)
        self.assertIsInstance(response.data["match_score"], float)
        self.assertGreaterEqual(response.data["match_score"], 0.0)
        self.assertLessEqual(response.data["match_score"], 1.0)
        self.assertFalse(response.data["is_saved"])

    def test_match_endpoint_scores_relevant_job_higher_than_irrelevant_job(self):
        self.client.force_authenticate(user=self.candidate)
        backend_response = self.client.get(self.backend_match_url)
        design_response = self.client.get(self.design_match_url)

        self.assertEqual(backend_response.status_code, status.HTTP_200_OK)
        self.assertEqual(design_response.status_code, status.HTTP_200_OK)
        self.assertGreater(
            backend_response.data["match_score"],
            design_response.data["match_score"],
        )

    def test_hr_cannot_request_job_match_score(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get(self.backend_match_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_match_score_is_persisted_and_returned_in_job_list(self):
        self.client.force_authenticate(user=self.candidate)
        first_match = self.client.get(self.backend_match_url)
        self.assertEqual(first_match.status_code, status.HTTP_200_OK)

        second_match = self.client.get(self.backend_match_url)
        self.assertEqual(second_match.status_code, status.HTTP_200_OK)
        self.assertTrue(second_match.data["is_saved"])

        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        backend_item = self._find_job(list_response.data["results"], self.backend_job.id)
        self.assertIsNotNone(backend_item)
        self.assertEqual(backend_item["match_score"], first_match.data["match_score"])

    def test_saved_match_is_cleared_after_cv_update_requires_rematch(self):
        self.client.force_authenticate(user=self.candidate)
        first_match = self.client.get(self.backend_match_url)
        self.assertEqual(first_match.status_code, status.HTTP_200_OK)
        self.assertFalse(first_match.data["is_saved"])

        profile_update = self.client.put(
            "/api/profile/me/",
            {
                "cv": SimpleUploadedFile(
                    "updated-profile-cv.txt",
                    b"kubernetes cloud distributed systems golang",
                    content_type="text/plain",
                ),
            },
            format="multipart",
        )
        self.assertEqual(profile_update.status_code, status.HTTP_200_OK)

        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        backend_item = self._find_job(list_response.data["results"], self.backend_job.id)
        self.assertIsNotNone(backend_item)
        self.assertIsNone(backend_item["match_score"])

        rematch = self.client.get(self.backend_match_url)
        self.assertEqual(rematch.status_code, status.HTTP_200_OK)
        self.assertFalse(rematch.data["is_saved"])

    def test_legacy_saved_match_is_recomputed_and_upgraded_to_current_engine(self):
        self.client.force_authenticate(user=self.candidate)
        legacy_match = JobMatchResult.objects.create(
            job=self.backend_job,
            candidate=self.candidate,
            score=0.1234,
            engine_version="legacy",
        )

        response = self.client.get(self.backend_match_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_saved"])

        legacy_match.refresh_from_db()
        self.assertEqual(legacy_match.engine_version, get_match_engine_version())


@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class ConversationListBehaviorTests(APITestCase):
    def setUp(self):
        self.hr = User.objects.create_user(
            email="hr-chat@example.com",
            username="hr_chat",
            password="password123",
            is_hr=True,
        )
        self.candidate = User.objects.create_user(
            email="candidate-chat@example.com",
            username="candidate_chat",
            password="password123",
            is_hr=False,
        )
        self.conversation = Conversation.objects.create(hr=self.hr, candidate=self.candidate)
        self.list_url = "/api/jobs/chats/"

    def test_candidate_sees_unread_count_excluding_own_messages(self):
        ChatMessage.objects.create(
            conversation=self.conversation,
            sender=self.hr,
            text="First incoming message",
        )
        ChatMessage.objects.create(
            conversation=self.conversation,
            sender=self.hr,
            text="Second incoming message",
        )
        ChatMessage.objects.create(
            conversation=self.conversation,
            sender=self.candidate,
            text="My reply",
        )

        self.client.force_authenticate(user=self.candidate)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["unread_count"], 2)

    def test_last_message_preview_uses_attachment_name(self):
        ChatMessage.objects.create(
            conversation=self.conversation,
            sender=self.hr,
            text="Text message first",
        )
        ChatMessage.objects.create(
            conversation=self.conversation,
            sender=self.hr,
            text="",
            attachment=SimpleUploadedFile(
                "resume.pdf",
                b"%PDF-1.4 attachment preview",
                content_type="application/pdf",
            ),
        )

        self.client.force_authenticate(user=self.candidate)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["last_message"], "📎 resume.pdf")
        self.assertIsNotNone(response.data[0]["last_message_at"])
