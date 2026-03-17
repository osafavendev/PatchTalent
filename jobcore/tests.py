import shutil
import tempfile
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()
TEMP_MEDIA_ROOT = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class ProfileFeatureAPITests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA_ROOT, ignore_errors=True)
    def setUp(self):
        self.candidate = User.objects.create_user(
            email="candidate@example.com",
            username="candidate",
            password="password123",
            is_hr=False,
        )
        self.candidate_two = User.objects.create_user(
            email="candidate2@example.com",
            username="candidate_two",
            password="password123",
            is_hr=False,
        )
        self.hr = User.objects.create_user(
            email="hr@example.com",
            username="hr",
            password="password123",
            is_hr=True,
        )
        self.other_hr = User.objects.create_user(
            email="hr2@example.com",
            username="hr_two",
            password="password123",
            is_hr=True,
        )

        self.candidate_profile_url = "/api/profile/me/"
        self.candidate_detail_url = f"/api/profile/candidates/{self.candidate.id}/"
        self.company_profile_url = "/api/profile/company/"
        self.experience_list_url = "/api/profile/experiences/"
        self.project_list_url = "/api/profile/projects/"

    def test_candidate_can_get_and_update_own_profile(self):
        self.client.force_authenticate(user=self.candidate)
        get_response = self.client.get(self.candidate_profile_url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)

        put_response = self.client.put(
            self.candidate_profile_url,
            {
                "headline": "Software Engineer",
                "about": "I build full stack products.",
                "location": "Lagos",
                "profile_picture_url": "https://example.com/me.png",
                "linkedin_url": "https://linkedin.com/in/candidate",
            },
            format="json",
        )
        self.assertEqual(put_response.status_code, status.HTTP_200_OK)
        self.assertEqual(put_response.data["headline"], "Software Engineer")
        self.assertEqual(put_response.data["profile_picture_url"], "https://example.com/me.png")

    def test_hr_cannot_use_candidate_profile_endpoint(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get(self.candidate_profile_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_can_get_and_update_company_profile(self):
        self.client.force_authenticate(user=self.hr)
        get_response = self.client.get(self.company_profile_url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)

        put_response = self.client.put(
            self.company_profile_url,
            {
                "company_name": "Patch Talent",
                "about": "We hire engineers globally.",
                "website": "https://patchtalent.com",
                "industry": "Staffing",
                "logo_url": "https://patchtalent.com/logo.png",
            },
            format="json",
        )
        self.assertEqual(put_response.status_code, status.HTTP_200_OK)
        self.assertEqual(put_response.data["company_name"], "Patch Talent")

    def test_candidate_cannot_use_company_profile_endpoint(self):
        self.client.force_authenticate(user=self.candidate)
        response = self.client.get(self.company_profile_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_candidate_can_crud_experience_only_for_self(self):
        self.client.force_authenticate(user=self.candidate)
        create_response = self.client.post(
            self.experience_list_url,
            {
                "title": "Backend Developer",
                "company": "Acme",
                "start_date": "2022-01-01",
                "end_date": "2024-01-01",
                "is_current": False,
                "description": "Built scalable APIs.",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        experience_id = create_response.data["id"]

        update_response = self.client.put(
            f"/api/profile/experiences/{experience_id}/",
            {"title": "Senior Backend Developer"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["title"], "Senior Backend Developer")

        self.client.force_authenticate(user=self.candidate_two)
        forbidden_response = self.client.put(
            f"/api/profile/experiences/{experience_id}/",
            {"title": "Hack Update"},
            format="json",
        )
        self.assertEqual(forbidden_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_candidate_can_create_update_project_with_screenshots(self):
        self.client.force_authenticate(user=self.candidate)
        create_response = self.client.post(
            self.project_list_url,
            {
                "name": "Job Tracker",
                "description": "A hiring platform project.",
                "project_url": "https://example.com/job-tracker",
                "repo_url": "https://github.com/example/job-tracker",
                "screenshot_urls": [
                    "https://example.com/shot1.png",
                    "https://example.com/shot2.png",
                ],
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(create_response.data["screenshots"]), 2)
        project_id = create_response.data["id"]

        update_response = self.client.put(
            f"/api/profile/projects/{project_id}/",
            {
                "description": "Updated project summary.",
                "screenshot_urls": ["https://example.com/new-shot.png"],
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["description"], "Updated project summary.")
        self.assertEqual(len(update_response.data["screenshots"]), 1)

    def test_hr_cannot_manage_candidate_experience_or_projects(self):
        self.client.force_authenticate(user=self.hr)

        experience_response = self.client.post(
            self.experience_list_url,
            {
                "title": "Nope",
                "company": "Nope Inc",
                "start_date": "2024-01-01",
            },
            format="json",
        )
        project_response = self.client.post(
            self.project_list_url,
            {"name": "Nope"},
            format="json",
        )
        self.assertEqual(experience_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(project_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_experience_dates_are_rejected(self):
        self.client.force_authenticate(user=self.candidate)
        response = self.client.post(
            self.experience_list_url,
            {
                "title": "Engineer",
                "company": "Bad Dates Inc",
                "start_date": "2025-01-01",
                "end_date": "2024-01-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_hr_can_view_candidate_profile_detail(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get(self.candidate_detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user_email"], self.candidate.email)
        self.assertIn("experiences", response.data)
        self.assertIn("projects", response.data)

    def test_non_hr_cannot_view_candidate_profile_detail(self):
        self.client.force_authenticate(user=self.candidate_two)
        response = self.client.get(self.candidate_detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_gets_404_for_non_candidate_profile_detail(self):
        self.client.force_authenticate(user=self.other_hr)
        response = self.client.get(f"/api/profile/candidates/{self.hr.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_candidate_can_upload_cv_from_profile_page(self):
        self.client.force_authenticate(user=self.candidate)
        response = self.client.put(
            self.candidate_profile_url,
            {
                "headline": "Backend Developer",
                "cv": SimpleUploadedFile(
                    "candidate-cv.txt",
                    b"python django backend api",
                    content_type="text/plain",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["headline"], "Backend Developer")
        self.assertIn("/media/profiles/cvs/", response.data["cv_url"])

    def test_candidate_can_update_existing_profile_cv(self):
        self.client.force_authenticate(user=self.candidate)
        first_response = self.client.put(
            self.candidate_profile_url,
            {
                "cv": SimpleUploadedFile(
                    "first-cv.txt",
                    b"python django",
                    content_type="text/plain",
                ),
            },
            format="multipart",
        )
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        first_cv_url = first_response.data["cv_url"]

        second_response = self.client.put(
            self.candidate_profile_url,
            {
                "cv": SimpleUploadedFile(
                    "second-cv.txt",
                    b"go rust distributed systems",
                    content_type="text/plain",
                ),
            },
            format="multipart",
        )
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertIn("/media/profiles/cvs/", second_response.data["cv_url"])
        self.assertNotEqual(second_response.data["cv_url"], first_cv_url)

    def test_candidate_profile_rejects_invalid_cv_extension(self):
        self.client.force_authenticate(user=self.candidate)
        response = self.client.put(
            self.candidate_profile_url,
            {
                "cv": SimpleUploadedFile(
                    "candidate-cv.exe",
                    b"invalid-cv",
                    content_type="application/octet-stream",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["cv"][0], "CV must be one of: PDF, DOC, DOCX, or TXT.")

    def test_company_profile_rejects_future_founded_year(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.put(
            self.company_profile_url,
            {"founded_year": 3000},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["founded_year"][0], "Founded year cannot be in the future.")
