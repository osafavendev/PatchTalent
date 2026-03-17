import AuthAPI from "./auth";

const ChatAPI = {
  listConversations: () => AuthAPI.get("jobs/chats/"),
  startConversation: (userId) => AuthAPI.post("jobs/chats/start/", { user_id: userId }),
  getMessages: (conversationId) => AuthAPI.get(`jobs/chats/${conversationId}/messages/`),
  sendMessage: (conversationId, payload = {}) => {
    const text = typeof payload === "string" ? payload : payload?.text || "";
    const attachment = typeof payload === "string" ? null : payload?.attachment || null;

    if (attachment) {
      const formData = new FormData();
      if (text.trim()) formData.append("text", text.trim());
      formData.append("attachment", attachment);
      return AuthAPI.post(`jobs/chats/${conversationId}/messages/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    return AuthAPI.post(`jobs/chats/${conversationId}/messages/`, { text: text.trim() });
  },
};

export default ChatAPI;
