import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'patchtalent.settings')

app = Celery('patchtalent')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
