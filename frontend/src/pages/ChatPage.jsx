import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { motion } from "framer-motion";

import ChatAPI from "../api/chat";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const buildWebSocketUrl = (conversationId) => {
  const token = localStorage.getItem("access_token");
  if (!token || !conversationId) return "";

  let host = "";
  let protocol = "ws:";
  try {
    const parsed = new URL(API_BASE || window.location.origin);
    host = parsed.host;
    protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  } catch {
    host = window.location.host;
    protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  }

  return `${protocol}//${host}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`;
};

const buildNotificationsWebSocketUrl = () => {
  const token = localStorage.getItem("access_token");
  if (!token) return "";

  let host = "";
  let protocol = "ws:";
  try {
    const parsed = new URL(API_BASE || window.location.origin);
    host = parsed.host;
    protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  } catch {
    host = window.location.host;
    protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  }

  return `${protocol}//${host}/ws/notifications/?token=${encodeURIComponent(token)}`;
};

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  return String(value);
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString();
};

const toAbsoluteMediaUrl = (url) => {
  if (!url) return null;
  if (String(url).startsWith("http://") || String(url).startsWith("https://")) {
    return url;
  }
  try {
    const parsed = new URL(API_BASE || window.location.origin);
    return `${parsed.origin}${url.startsWith("/") ? url : `/${url}`}`;
  } catch {
    return url;
  }
};

const getInitial = (name) => {
  if (!name) return "?";
  return String(name).trim().charAt(0).toUpperCase();
};

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const wsRef = useRef(null);
  const notificationsWsRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const selectedConversationIdRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationSearch, setConversationSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [otherParticipantSeenAt, setOtherParticipantSeenAt] = useState(null);
  const [incomingNotification, setIncomingNotification] = useState("");
  const [error, setError] = useState("");

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );
  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      String(conversation?.other_user_username || "")
        .toLowerCase()
        .includes(query)
    );
  }, [conversations, conversationSearch]);

  const isOwnMessage = (message) => {
    const senderId = normalizeId(message?.sender_id);
    const me = normalizeId(currentUserId);
    if (senderId && me) return senderId === me;

    const otherUserId = normalizeId(selectedConversation?.other_user_id);
    if (senderId && otherUserId) return senderId !== otherUserId;
    return false;
  };

  const latestOwnMessageId = useMemo(() => {
    for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
      if (isOwnMessage(messages[idx])) return messages[idx].id;
    }
    return null;
  }, [messages, currentUserId, selectedConversation]);

  const latestOwnMessageSeen = useMemo(() => {
    if (!latestOwnMessageId || !otherParticipantSeenAt) return false;
    const latestOwnMessage = messages.find((item) => item.id === latestOwnMessageId);
    if (!latestOwnMessage?.created_at) return false;
    const seenAtMs = new Date(otherParticipantSeenAt).getTime();
    const sentAtMs = new Date(latestOwnMessage.created_at).getTime();
    if (Number.isNaN(seenAtMs) || Number.isNaN(sentAtMs)) return false;
    return seenAtMs >= sentAtMs;
  }, [latestOwnMessageId, messages, otherParticipantSeenAt]);

  useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        const payload = jwtDecode(token);
        setCurrentUserId(payload?.user_id ?? null);
      }
    } catch {
      setCurrentUserId(null);
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const loadConversations = async (preferredConversationId = null) => {
    const listRes = await ChatAPI.listConversations();
    const list = listRes?.data || [];
    setConversations(list);

    const queryConversationId = Number(searchParams.get("conversationId"));
    const candidateId =
      preferredConversationId || queryConversationId || list?.[0]?.id || null;
    if (candidateId) {
      const exists = list.some((item) => item.id === Number(candidateId));
      if (exists) {
        setSelectedConversationId(Number(candidateId));
      } else if (list?.[0]?.id) {
        setSelectedConversationId(list[0].id);
      } else {
        setSelectedConversationId(null);
      }
    } else {
      setSelectedConversationId(null);
    }
    return list;
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoadingConversations(true);
      setError("");
      try {
        const startUserId = Number(searchParams.get("userId"));
        if (startUserId) {
          const startRes = await ChatAPI.startConversation(startUserId);
          const conversationId = startRes?.data?.id;
          await loadConversations(conversationId);
          if (conversationId && isMounted) {
            setSearchParams({ conversationId: String(conversationId) }, { replace: true });
          }
        } else {
          await loadConversations();
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err?.response?.data?.detail || "Failed to load conversations.");
      } finally {
        if (isMounted) setLoadingConversations(false);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    let isMounted = true;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      setError("");
      try {
        const res = await ChatAPI.getMessages(selectedConversationId);
        if (!isMounted) return;
        setMessages(res?.data || []);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.response?.data?.detail || "Failed to load messages.");
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };
    fetchMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedConversationId]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation) {
      setOtherParticipantSeenAt(null);
      return;
    }
    const seenAt = selectedConversation?.other_user_is_hr
      ? selectedConversation?.hr_last_seen_at
      : selectedConversation?.candidate_last_seen_at;
    setOtherParticipantSeenAt(seenAt || null);
  }, [
    selectedConversation,
    selectedConversation?.other_user_is_hr,
    selectedConversation?.hr_last_seen_at,
    selectedConversation?.candidate_last_seen_at,
  ]);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setSocketConnected(false);

    if (!selectedConversationId) return;

    const wsUrl = buildWebSocketUrl(selectedConversationId);
    if (!wsUrl) return;

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setSocketConnected(true);
    };

    socket.onclose = () => {
      setSocketConnected(false);
    };

    socket.onerror = () => {
      setSocketConnected(false);
      setError("Realtime connection failed. Refresh and try again.");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "error") {
          setError(payload?.detail || "Realtime chat error.");
          return;
        }
        if (payload?.type === "seen") {
          const seenBy = normalizeId(payload?.seen_by_id);
          const me = normalizeId(currentUserId);
          if (seenBy && me && seenBy !== me) {
            setOtherParticipantSeenAt(payload?.seen_at || null);
          }
          return;
        }
        if (payload?.type === "message") {
          setMessages((prev) => {
            if (prev.some((item) => item.id === payload.id)) return prev;
            return [...prev, payload];
          });
          const isIncoming =
            normalizeId(currentUserId) !== null &&
            normalizeId(payload.sender_id) !== normalizeId(currentUserId);
          if (isIncoming) {
            setIncomingNotification(`New DM from ${payload.sender_username}`);
            setTimeout(() => setIncomingNotification(""), 2500);

            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              const notificationBody =
                payload.text ||
                (payload.attachment_name ? `📎 ${payload.attachment_name}` : "New message");
              new Notification(`New DM from ${payload.sender_username}`, {
                body: notificationBody,
              });
            }
          }
        }
      } catch {
        // ignore malformed websocket payloads
      }
    };

    return () => {
      socket.close();
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };
  }, [selectedConversationId, currentUserId]);

  useEffect(() => {
    if (notificationsWsRef.current) {
      notificationsWsRef.current.close();
      notificationsWsRef.current = null;
    }
    const wsUrl = buildNotificationsWebSocketUrl();
    if (!wsUrl) return;

    const socket = new WebSocket(wsUrl);
    notificationsWsRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type !== "conversation_update" || !payload?.conversation) return;

        const updatedConversation = payload.conversation;
        setConversations((prev) => {
          const withoutCurrent = prev.filter((item) => item.id !== updatedConversation.id);
          const merged = [updatedConversation, ...withoutCurrent];
          merged.sort((a, b) => {
            const aTime = new Date(a?.updated_at || a?.last_message_at || 0).getTime();
            const bTime = new Date(b?.updated_at || b?.last_message_at || 0).getTime();
            return bTime - aTime;
          });
          return merged;
        });

        const isIncomingForOtherConversation =
          Number(updatedConversation?.unread_count || 0) > 0 &&
          updatedConversation.id !== Number(selectedConversationIdRef.current);
        if (isIncomingForOtherConversation) {
          setIncomingNotification(`New DM from ${updatedConversation.other_user_username}`);
          setTimeout(() => setIncomingNotification(""), 2500);

          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(`New DM from ${updatedConversation.other_user_username}`, {
              body: updatedConversation.last_message || "You have a new message.",
            });
          }
        }
      } catch {
        // ignore malformed websocket payloads
      }
    };

    return () => {
      socket.close();
      if (notificationsWsRef.current === socket) {
        notificationsWsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedConversationId]);

  const handleSelectConversation = (conversationId) => {
    setSelectedConversationId(conversationId);
    setSearchParams({ conversationId: String(conversationId) }, { replace: true });
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    const text = draft.trim();
    const hasAttachment = !!selectedAttachment;
    if ((!text && !hasAttachment) || !selectedConversationId || sending) return;
    setSending(true);
    setError("");
    try {
      if (hasAttachment) {
        const response = await ChatAPI.sendMessage(selectedConversationId, {
          text,
          attachment: selectedAttachment,
        });
        const createdMessage = response?.data;
        if (
          createdMessage &&
          (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
        ) {
          setMessages((prev) => {
            if (prev.some((item) => item.id === createdMessage.id)) return prev;
            return [...prev, createdMessage];
          });
        }
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ text }));
      } else {
        const response = await ChatAPI.sendMessage(selectedConversationId, { text });
        const createdMessage = response?.data;
        if (createdMessage) {
          setMessages((prev) => {
            if (prev.some((item) => item.id === createdMessage.id)) return prev;
            return [...prev, createdMessage];
          });
        }
      }
      setDraft("");
      setSelectedAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedAttachment(file);
  };

  const handleDraftKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app-shell page-enter relative px-4 py-8">
      <div className="pointer-events-none absolute -left-12 top-24 h-44 w-44 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 bottom-20 h-52 w-52 rounded-full bg-fuchsia-300/20 blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <div className="clean-card mb-5 flex flex-wrap items-center justify-between gap-3 border-white/70 bg-white/80 p-4 sm:p-5">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="smooth-press text-sm font-semibold text-indigo-600 hover:underline"
            >
              ← Back
            </button>
            <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              <span className="glass-dot" />
              Realtime Messaging
            </div>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Direct Messages</h1>
            <p className="text-sm text-gray-500">Real-time chat with candidates and HR</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="btn-secondary smooth-press"
          >
            Jobs Dashboard
          </button>
        </div>
        {error && <div className="alert-error mb-4">{error}</div>}
        {incomingNotification && <div className="alert-info mb-4">{incomingNotification}</div>}
        

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="smooth-lift clean-card border-white/70 bg-white/80 lg:col-span-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Chats</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {conversations.length}
              </span>
            </div>

            <input
              type="text"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search chats..."
              className="input-clean mb-3"
            />

            <div className="h-[66vh] overflow-y-auto pr-1">
              {loadingConversations ? (
                <div className="clean-card-soft border-white/60 bg-white/70 p-4 text-sm text-gray-500">
                  Loading conversations...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="clean-card-soft border-dashed border-white/60 bg-white/70 p-4 text-sm text-gray-500">
                  No chats found.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => {
                    const isSelected = conversation.id === selectedConversationId;
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`smooth-lift w-full rounded-2xl border p-3 text-left transition ${
                          isSelected
                            ? "border-indigo-300 bg-indigo-50/80 shadow-sm"
                            : "border-white/60 bg-white/70 hover:bg-white/90"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-bold text-white">
                            {getInitial(conversation.other_user_username)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {conversation.other_user_username}
                              </p>
                              <span className="text-[11px] text-gray-500">
                                {formatTime(conversation.last_message_at)}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                              {conversation.other_user_is_hr ? "HR" : "Candidate"}
                            </p>
                            {conversation.last_message && (
                              <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                                {conversation.last_message}
                              </p>
                            )}
                            {conversation.unread_count > 0 && (
                              <span className="mt-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="smooth-lift clean-card border-white/70 bg-white/80 lg:col-span-8 flex h-[76vh] flex-col p-4">
            {!selectedConversation ? (
              <div className="clean-card-soft m-auto max-w-sm border-white/60 bg-white/70 px-6 py-8 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl">
                  💬
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Select a chat to start messaging
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Your DMs will appear here in real time.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 rounded-2xl border border-indigo-100/70 bg-white/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-bold text-white">
                        {getInitial(selectedConversation.other_user_username)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          {selectedConversation.other_user_username}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {selectedConversation.other_user_is_hr ? "HR user" : "Candidate user"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        socketConnected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {socketConnected ? "Live" : "Reconnecting"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto rounded-2xl border border-white/60 bg-gradient-to-b from-white/80 to-slate-100/80 p-3">
                  {loadingMessages ? (
                    <div className="text-sm text-gray-500">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="mt-10 text-center text-sm text-gray-500">
                      No messages yet. Send the first message.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10, scale: 0.99 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className={`flex ${
                            isOwnMessage(message) ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
                              isOwnMessage(message)
                                ? "rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                                : "rounded-bl-md border border-gray-200 bg-white text-gray-900"
                            }`}
                          >
                            <div
                              className={`mb-1 text-[11px] ${
                                isOwnMessage(message) ? "text-blue-100" : "text-gray-500"
                              }`}
                            >
                              {isOwnMessage(message) ? "You" : message.sender_username} •{" "}
                              {formatDateTime(message.created_at)}
                            </div>
                            {message.text && (
                              <div className="whitespace-pre-wrap break-words text-sm">
                                {message.text}
                              </div>
                            )}
                            {message.attachment_url && (
                              <a
                                href={toAbsoluteMediaUrl(message.attachment_url)}
                                target="_blank"
                                rel="noreferrer"
                                className={`mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-md px-2 py-1 text-xs font-medium ${
                                  isOwnMessage(message)
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                }`}
                              >
                                📎 {message.attachment_name || "Attachment"}
                              </a>
                            )}
                            {isOwnMessage(message) &&
                              latestOwnMessageSeen &&
                              latestOwnMessageId === message.id && (
                                <p className="mt-1 text-[10px] text-blue-100">
                                  Seen {formatTime(otherParticipantSeenAt)}
                                </p>
                              )}
                          </div>
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-2xl border border-white/60 bg-white/80 p-2 shadow-sm">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentChange}
                  />
                  {selectedAttachment && (
                    <div className="mb-2 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                      <span className="truncate">📎 {selectedAttachment.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAttachment(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="ml-2 font-semibold text-indigo-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="smooth-press rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                      title="Attach a file"
                    >
                      📎
                    </button>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleDraftKeyDown}
                      rows={2}
                      placeholder="Write a message..."
                      className="textarea-clean flex-1 resize-none"
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || (!draft.trim() && !selectedAttachment)}
                      className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                        sending || (!draft.trim() && !selectedAttachment)
                          ? "cursor-not-allowed bg-slate-300 text-slate-600"
                          : "btn-primary smooth-press text-white"
                      }`}
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                  <p className="mt-1 px-1 text-[11px] text-gray-400">
                    Attach files with 📎 • Press Enter to send • Shift + Enter for new line
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
