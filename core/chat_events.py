from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Count, F, Q
import os

from .models import ChatMessage, Conversation


def _to_iso(value):
    if not value:
        return None
    return value.isoformat()


def serialize_conversation_for_user(conversation, user):
    other_user = conversation.candidate if user.is_hr else conversation.hr
    last_message = conversation.messages.order_by("-created_at").first()
    if last_message and last_message.text:
        last_message_preview = last_message.text
    elif last_message and last_message.attachment:
        last_message_preview = f"📎 {os.path.basename(last_message.attachment.name)}"
    else:
        last_message_preview = None
    return {
        "id": conversation.id,
        "hr_id": conversation.hr_id,
        "hr_username": conversation.hr.username,
        "candidate_id": conversation.candidate_id,
        "candidate_username": conversation.candidate.username,
        "other_user_id": other_user.id,
        "other_user_username": other_user.username,
        "other_user_is_hr": False if user.is_hr else True,
        "last_message": last_message_preview,
        "last_message_at": _to_iso(last_message.created_at if last_message else None),
        "unread_count": conversation.unread_count_for_user(user),
        "hr_last_seen_at": _to_iso(conversation.hr_last_seen_at),
        "candidate_last_seen_at": _to_iso(conversation.candidate_last_seen_at),
        "created_at": _to_iso(conversation.created_at),
        "updated_at": _to_iso(conversation.updated_at),
    }


def total_unread_for_user(user):
    if user.is_hr:
        result = Conversation.objects.filter(hr=user).aggregate(
            total=Count(
                "messages",
                filter=(
                    ~Q(messages__sender=user)
                    & (
                        Q(hr_last_seen_at__isnull=True)
                        | Q(messages__created_at__gt=F("hr_last_seen_at"))
                    )
                ),
            )
        )
    else:
        result = Conversation.objects.filter(candidate=user).aggregate(
            total=Count(
                "messages",
                filter=(
                    ~Q(messages__sender=user)
                    & (
                        Q(candidate_last_seen_at__isnull=True)
                        | Q(messages__created_at__gt=F("candidate_last_seen_at"))
                    )
                ),
            )
        )
    return int(result.get("total") or 0)


def push_user_notification(user, payload):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    async_to_sync(channel_layer.group_send)(
        f"user_{user.id}",
        {
            "type": "chat_notify",
            "payload": payload,
        },
    )


def broadcast_conversation_update(conversation):
    conversation = (
        Conversation.objects.filter(id=conversation.id)
        .select_related("hr", "candidate")
        .first()
    )
    if not conversation:
        return

    for participant in (conversation.hr, conversation.candidate):
        push_user_notification(
            participant,
            {
                "type": "conversation_update",
                "conversation": serialize_conversation_for_user(conversation, participant),
                "total_unread": total_unread_for_user(participant),
            },
        )


def unread_summary_payload_for_user(user):
    return {
        "type": "unread_summary",
        "total_unread": total_unread_for_user(user),
    }


def serialize_chat_message(message):
    attachment_name = None
    attachment_url = None
    attachment_size = None
    if message.attachment:
        attachment_name = os.path.basename(message.attachment.name)
        attachment_url = message.attachment.url
        try:
            attachment_size = message.attachment.size
        except Exception:
            attachment_size = None
    return {
        "id": message.id,
        "conversation": message.conversation_id,
        "sender_id": message.sender_id,
        "sender_username": message.sender.username,
        "text": message.text,
        "attachment_url": attachment_url,
        "attachment_name": attachment_name,
        "attachment_size": attachment_size,
        "created_at": _to_iso(message.created_at),
    }


def broadcast_chat_message(message):
    message = (
        ChatMessage.objects.filter(id=message.id)
        .select_related("sender", "conversation")
        .first()
    )
    if not message:
        return
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    async_to_sync(channel_layer.group_send)(
        f"chat_{message.conversation_id}",
        {
            "type": "chat.message",
            "payload": serialize_chat_message(message),
        },
    )


def message_seen_payload(conversation, seen_by_user):
    seen_at = None
    if seen_by_user.id == conversation.hr_id:
        seen_at = conversation.hr_last_seen_at
    elif seen_by_user.id == conversation.candidate_id:
        seen_at = conversation.candidate_last_seen_at
    return {
        "conversation_id": conversation.id,
        "seen_by_id": seen_by_user.id,
        "seen_by_username": seen_by_user.username,
        "seen_at": _to_iso(seen_at),
    }


def broadcast_message_seen(conversation, seen_by_user):
    conversation = (
        Conversation.objects.filter(id=conversation.id)
        .select_related("hr", "candidate")
        .first()
    )
    if not conversation:
        return
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    async_to_sync(channel_layer.group_send)(
        f"chat_{conversation.id}",
        {
            "type": "chat.seen",
            "payload": message_seen_payload(conversation, seen_by_user),
        },
    )
