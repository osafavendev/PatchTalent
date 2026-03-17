from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import Job


@shared_task
def delete_jobs_older_than_month():
    cutoff = timezone.now() - timedelta(days=30)
    stale_jobs = Job.objects.filter(created_at__lt=cutoff)
    stale_job_count = stale_jobs.count()
    stale_jobs.delete()
    return stale_job_count
