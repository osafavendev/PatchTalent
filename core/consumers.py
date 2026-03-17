from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework_simplejwt.tokens import AccessToken
from .chat_events import (
    broadcast_conversation_update,
    message_seen_payload,
    serialize_chat_message,
    unread_summary_payload_for_user,
)

from .models import ChatMessage, Conversation

MAX_CHAT_MESSAGE_LENGTH = 3000

class TokenAuthWebsocketConsumer(AsyncJsonWebsocketConsumer):
    def _get_token_from_query_string(self):
        query_params = parse_qs(self.scope.get("query_string", b"").decode())
        token_values = query_params.get("token")
        if not token_values:
            return None
        return token_values[0]

    @database_sync_to_async
    def _get_user_from_token(self, token):
        try:
            validated_token = AccessToken(token)
            user_id = validated_token.get("user_id")
            if not user_id:
                return None
            User = get_user_model()
            return User.objects.filter(id=user_id).first()
        except Exception:
            return None


class UserNotificationsConsumer(TokenAuthWebsocketConsumer):
    async def connect(self):
        token = self._get_token_from_query_string()
        if not token:
            await self.close(code=4001)
            return

        user = await self._get_user_from_token(token)
        if not user:
            await self.close(code=4001)
            return

        self.user = user
        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        payload = await self._build_unread_summary(self.user.id)
        await self.send_json(payload)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def chat_notify(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def _build_unread_summary(self, user_id):
        user = get_user_model().objects.filter(id=user_id).first()
        if not user:
            return {"type": "unread_summary", "total_unread": 0}
        return unread_summary_payload_for_user(user)


class ConversationChatConsumer(TokenAuthWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.group_name = f"chat_{self.conversation_id}"

        token = self._get_token_from_query_string()
        if not token:
            await self.close(code=4001)
            return

        user = await self._get_user_from_token(token)
        if not user:
            await self.close(code=4001)
            return

        is_participant = await self._is_user_participant(user.id, self.conversation_id)
        if not is_participant:
            await self.close(code=4003)
            return

        self.user = user
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self._handle_seen_update()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("action") == "mark_seen":
            await self._handle_seen_update()
            return
        text = str(content.get("text", "")).strip()
        if not text:
            await self.send_json({"type": "error", "detail": "Message cannot be empty."})
            return
        if len(text) > MAX_CHAT_MESSAGE_LENGTH:
            await self.send_json(
                {
                    "type": "error",
                    "detail": f"Message cannot exceed {MAX_CHAT_MESSAGE_LENGTH} characters.",
                }
            )
            return

        is_participant = await self._is_user_participant(self.user.id, self.conversation_id)
        if not is_participant:
            await self.send_json({"type": "error", "detail": "Conversation not found."})
            await self.close(code=4003)
            return

        message_payload = await self._create_message_payload(
            conversation_id=self.conversation_id,
            sender_id=self.user.id,
            text=text,
        )
        if not message_payload:
            await self.send_json({"type": "error", "detail": "Conversation not found."})
            return
        await self._handle_seen_update()

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "payload": message_payload,
            },
        )

    async def chat_message(self, event):
        await self.send_json({"type": "message", **event["payload"]})
        sender_id = str(event["payload"].get("sender_id"))
        if sender_id != str(self.user.id):
            await self._handle_seen_update()

    async def chat_seen(self, event):
        await self.send_json({"type": "seen", **event["payload"]})

    async def _handle_seen_update(self):
        seen_payload = await self._mark_conversation_seen(self.user.id, self.conversation_id)
        await self._broadcast_conversation_update(self.conversation_id)
        if seen_payload:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat.seen",
                    "payload": seen_payload,
                },
            )

    @database_sync_to_async
    def _is_user_participant(self, user_id, conversation_id):
        return Conversation.objects.filter(id=conversation_id).filter(
            Q(hr_id=user_id) | Q(candidate_id=user_id)
        ).exists()

    @database_sync_to_async
    def _create_message_payload(self, conversation_id, sender_id, text):
        conversation = Conversation.objects.filter(id=conversation_id).first()
        if not conversation:
            return None
        message = ChatMessage.objects.create(
            conversation=conversation,
            sender_id=sender_id,
            text=text,
        )
        return serialize_chat_message(message)

    @database_sync_to_async
    def _mark_conversation_seen(self, user_id, conversation_id):
        conversation = Conversation.objects.filter(id=conversation_id).first()
        if not conversation:
            return
        user = get_user_model().objects.filter(id=user_id).first()
        if not user:
            return
        conversation.mark_seen(user)
        conversation.refresh_from_db(fields=["hr_last_seen_at", "candidate_last_seen_at"])
        return message_seen_payload(conversation, user)

    @database_sync_to_async
    def _broadcast_conversation_update(self, conversation_id):
        conversation = Conversation.objects.filter(id=conversation_id).first()
        if not conversation:
            return
        broadcast_conversation_update(conversation)
