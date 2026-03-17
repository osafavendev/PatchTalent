from django.urls import path
from .views import (
    JobCreateView,
    JobListView,
    JobDetailView,
    JobApplyView,
    JobMatchScoreView,
    JobApplicantsListView,
    ConversationListView,
    ConversationStartView,
    ConversationMessagesView,
)

urlpatterns = [
    path('', JobListView.as_view(), name='job-list'),
    path('create/', JobCreateView.as_view(), name='job-create'),
    path('<int:pk>/', JobDetailView.as_view(), name='job-detail'),
    path('<int:pk>/apply/', JobApplyView.as_view(), name='job-apply'),
    path('<int:pk>/match/', JobMatchScoreView.as_view(), name='job-match-score'),
    path('<int:pk>/applications/', JobApplicantsListView.as_view(), name='job-applicants-list'),
    path('chats/', ConversationListView.as_view(), name='conversation-list'),
    path('chats/start/', ConversationStartView.as_view(), name='conversation-start'),
    path('chats/<int:conversation_id>/messages/', ConversationMessagesView.as_view(), name='conversation-messages'),
]
