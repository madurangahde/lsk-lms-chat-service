import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { createHttpClient } from "../api/http.js";
import { connectSocket, closeSocket } from "../socket/socket.js";
import {
  mergeMessages,
  resolveErrorMessage,
  upsertConversation,
} from "../utils/chat.js";
import TopBar from "../components/TopBar.jsx";
import MessageList from "../components/MessageList.jsx";
import MessageComposer from "../components/MessageComposer.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";
import AppShell from "../layouts/AppShell.jsx";
import ConversationList from "../components/ConversationList.jsx";

export default function UserChatPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const http = useMemo(() => createHttpClient(token), [token]);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [socketState, setSocketState] = useState("connecting");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadInitial() {
      try {
        const [conversationRes, messagesRes] = await Promise.all([
          http.get("/me/conversation"),
          http.get("/me/messages", { params: { limit: 100 } }),
        ]);

        if (!mounted) return;
        setConversation(conversationRes.data);
        setMessages(messagesRes.data.items || []);
        await http.post("/me/read");
      } catch (err) {
        if (!mounted) return;
        const message = resolveErrorMessage(err, "Failed to load your chat");
        setError(message);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          logout();
          navigate("/login", { replace: true });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInitial();

    return () => {
      mounted = false;
    };
  }, [token, http, logout, navigate]);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const onConnect = () => setSocketState("connected");
    const onDisconnect = () => setSocketState("disconnected");
    const onConnectError = (err) => {
      const status = err?.data?.status;
      const message = String(err?.message || "Socket connection failed");
      const lower = message.toLowerCase();

      setError(message);

      if (
        status === 401 ||
        lower.includes("missing bearer token") ||
        lower.includes("expired") ||
        lower.includes("invalid bearer token")
      ) {
        closeSocket();
        logout();
        navigate("/login", { replace: true });
      }
    };
    const onMessage = (message) => {
      setMessages((prev) => mergeMessages(prev, message));
      if (message.senderType === "ADMIN") {
        http.post("/me/read").catch(() => {});
      }
    };
    const onConversationUpdated = (nextConversation) => {
      setConversation((prev) => ({ ...(prev || {}), ...nextConversation }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("message:new", onMessage);
    socket.on("conversation:self:updated", onConversationUpdated);

    if (socket.connected) {
      setSocketState("connected");
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("message:new", onMessage);
      socket.off("conversation:self:updated", onConversationUpdated);
      closeSocket();
    };
  }, [token, http, logout, navigate]);

  const handleSend = async (text) => {
    setSending(true);
    setError("");
    try {
      const socket = connectSocket(token);
      if (!socket) {
        throw new Error("Socket is not initialized");
      }
      const response = await new Promise((resolve) => {
        socket.emit("message:user:send", { text }, resolve);
      });

      if (!response?.ok) {
        throw new Error(response?.message || "Failed to send message");
      }

      setConversation(response.data.conversation);
      setMessages((prev) => mergeMessages(prev, response.data.message));
      return true;
    } catch (err) {
      setError(resolveErrorMessage(err, "Failed to send message"));
      return false;
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingScreen label="Loading your conversation..." />;
  }

  return (
    <AppShell
      topbar={
        <TopBar
          user={user}
          onLogout={logout}
          rightSlot={
            <div className={`status-chip ${socketState}`}>{socketState}</div>
          }
        />
      }
      sidebar={
        <ConversationList
          items={conversation ? [conversation] : []}
          selectedId={conversation?.id}
          onSelect={() => {}}
        />
      }
      content={
        <div className="chat-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Chat with Admin</div>
              <div className="muted small">
                Only you and the admins can see this conversation.
              </div>
            </div>
          </div>
          {error && <div className="error-banner">{error}</div>}
          <MessageList
            items={messages}
            currentUser={user}
            emptyLabel="Start the conversation with your first message."
          />
          <MessageComposer
            onSend={handleSend}
            sending={sending}
            placeholder="Write your question or reply to the admin..."
          />
        </div>
      }
    />
  );
}
