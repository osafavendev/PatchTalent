from django.urls import re_path

from .consumers import ConversationChatConsumer, UserNotificationsConsumer


websocket_urlpatterns = [
    re_path(r"ws/notifications/$", UserNotificationsConsumer.as_asgi()),
    re_path(r"ws/chat/(?P<conversation_id>\d+)/$", ConversationChatConsumer.as_asgi()),
]
