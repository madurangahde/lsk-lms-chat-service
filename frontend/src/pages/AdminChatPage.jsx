import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { createHttpClient } from "../api/http.js";
import { connectSocket, closeSocket } from "../socket/socket.js";
import {
  mergeMessages,
  resolveErrorMessage,
  sortConversations,
  upsertConversation,
} from "../utils/chat.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import TopBar from "../components/TopBar.jsx";
import AppShell from "../layouts/AppShell.jsx";
import ConversationList from "../components/ConversationList.jsx";
import MessageList from "../components/MessageList.jsx";
import MessageComposer from "../components/MessageComposer.jsx";
import BroadcastBox from "../components/BroadcastBox.jsx";

export default function AdminChatPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const http = useMemo(() => createHttpClient(token), [token]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [studentMatches, setStudentMatches] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [error, setError] = useState("");
  const [socketState, setSocketState] = useState("connecting");
  const selectedConversationRef = useRef(null);

  const loadConversations = async (
    searchValue = search,
    onlyUnreadValue = onlyUnread,
  ) => {
    const response = await http.get("/admin/conversations", {
      params: {
        page: 1,
        limit: 100,
        search: searchValue || undefined,
        onlyUnread: onlyUnreadValue || undefined,
      },
    });
    const items = sortConversations(response.data.items || []);
    setConversations(items);

    setSelectedConversation((prev) => {
      if (prev) {
        return items.find((item) => item.id === prev.id) || items[0] || null;
      }
      return items[0] || null;
    });
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const response = await http.get(
        `/admin/conversations/${conversationId}/messages`,
        {
          params: { limit: 100 },
        },
      );
      setMessages(response.data.items || []);
      await http.post(`/admin/conversations/${conversationId}/read`);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadStudentMatches = async (searchValue = search) => {
    const trimmed = String(searchValue || "").trim();
    if (!trimmed) {
      setStudentMatches([]);
      return;
    }

    setSearchingStudents(true);
    try {
      const response = await http.get("/admin/students", {
        params: { page: 1, limit: 20, search: trimmed },
      });
      setStudentMatches(response.data.items || []);
    } finally {
      setSearchingStudents(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function bootstrap() {
      try {
        await loadConversations("", false);
      } catch (err) {
        if (!mounted) return;
        setError(
          resolveErrorMessage(err, "Failed to load admin conversations"),
        );
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          logout();
          navigate("/login", { replace: true });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [token, http, logout, navigate]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    if (!selectedConversation?.id) {
      setMessages([]);
      return;
    }

    loadMessages(selectedConversation.id).catch((err) => {
      setError(resolveErrorMessage(err, "Failed to load messages"));
    });
  }, [selectedConversation?.id]);

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
    const onConversationUpdated = (conversation) => {
      setConversations((prev) => upsertConversation(prev, conversation));
      setSelectedConversation((prev) => {
        if (!prev) return prev;
        return prev.id === conversation.id
          ? { ...prev, ...conversation }
          : prev;
      });
    };
    const onMessage = (message) => {
      if (selectedConversationRef.current?.id === message.conversationId) {
        setMessages((prev) => mergeMessages(prev, message));
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("conversation:updated", onConversationUpdated);
    socket.on("message:new", onMessage);

    if (socket.connected) {
      setSocketState("connected");
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("message:new", onMessage);
      closeSocket();
    };
  }, [token, logout, navigate]);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;
    const currentId = selectedConversation?.id;
    if (!currentId) return undefined;

    socket.emit(
      "conversation:subscribe",
      { conversationId: currentId },
      () => {},
    );
    return () => {
      socket.emit(
        "conversation:unsubscribe",
        { conversationId: currentId },
        () => {},
      );
    };
  }, [token, selectedConversation?.id]);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    try {
      await Promise.all([
        loadConversations(search, onlyUnread),
        loadStudentMatches(search),
      ]);
    } catch (err) {
      setError(resolveErrorMessage(err, "Failed to search conversations"));
    }
  };

  const handleUnreadToggle = async () => {
    const next = !onlyUnread;
    setOnlyUnread(next);
    try {
      await loadConversations(search, next);
    } catch (err) {
      setError(resolveErrorMessage(err, "Failed to refresh conversations"));
    }
  };

  const handleSend = async (text) => {
    if (!selectedConversation?.id) return false;
    setSending(true);
    setError("");
    try {
      const socket = connectSocket(token);
      if (!socket) {
        throw new Error("Socket is not initialized");
      }
      const response = await new Promise((resolve) => {
        socket.emit(
          "message:admin:send",
          { conversationId: selectedConversation.id, text },
          resolve,
        );
      });

      if (!response?.ok) {
        throw new Error(response?.message || "Failed to send admin reply");
      }

      setMessages((prev) => mergeMessages(prev, response.data.message));
      setConversations((prev) =>
        upsertConversation(prev, response.data.conversation),
      );
      setSelectedConversation((prev) => ({
        ...(prev || {}),
        ...response.data.conversation,
      }));
      return true;
    } catch (err) {
      setError(resolveErrorMessage(err, "Failed to send reply"));
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleBroadcast = async (text) => {
    setBroadcasting(true);
    setError("");
    try {
      const socket = connectSocket(token);
      if (!socket) {
        throw new Error("Socket is not initialized");
      }
      const response = await new Promise((resolve) => {
        socket.emit("message:broadcast", { text }, resolve);
      });

      if (!response?.ok) {
        throw new Error(response?.message || "Broadcast failed");
      }

      await loadConversations(search, onlyUnread);
      setError(
        `Broadcast sent successfully to ${response.data.deliveredUsers} users.`,
      );
      return true;
    } catch (err) {
      setError(resolveErrorMessage(err, "Failed to broadcast message"));
      return false;
    } finally {
      setBroadcasting(false);
    }
  };

  const handleStartConversation = async (student) => {
    setError("");
    try {
      const response = await http.post("/admin/conversations/start", {
        id: student.id,
        name: student.name,
        email: student.email,
      });

      const conversation = response.data;
      setConversations((prev) => upsertConversation(prev, conversation));
      setSelectedConversation(conversation);
      setStudentMatches((prev) =>
        prev.map((item) =>
          item.id === student.id
            ? { ...item, conversationId: conversation.id }
            : item,
        ),
      );
    } catch (err) {
      setError(resolveErrorMessage(err, "Failed to start conversation"));
    }
  };

  if (loading) {
    return <LoadingScreen label="Loading admin chat console..." />;
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
        <div className="sidebar-stack">
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by user, email, or id"
            />
            <button className="btn btn-secondary" type="submit">
              Search
            </button>
          </form>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={onlyUnread}
              onChange={handleUnreadToggle}
            />
            <span>Only unread</span>
          </label>
          <ConversationList
            items={conversations}
            selectedId={selectedConversation?.id}
            onSelect={setSelectedConversation}
            isAdmin
          />
          {search.trim() && (
            <div className="student-match-box">
              <div className="student-match-box__title">Students from LMS</div>
              {searchingStudents ? (
                <div className="panel-empty">Searching students...</div>
              ) : studentMatches.length ? (
                <div className="student-match-list">
                  {studentMatches.map((student) => (
                    <div key={student.id} className="student-match-item">
                      <div>
                        <div className="student-match-item__name">
                          {student.name}
                        </div>
                        <div className="muted small">
                          {student.email || student.id}
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => handleStartConversation(student)}
                      >
                        {student.conversationId ? "Open chat" : "Start chat"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel-empty">No LMS student matches.</div>
              )}
            </div>
          )}
        </div>
      }
      content={
        <div className="chat-panel chat-panel--admin">
          <BroadcastBox onBroadcast={handleBroadcast} sending={broadcasting} />
          {error && (
            <div
              className={
                error.startsWith("Broadcast sent")
                  ? "success-banner"
                  : "error-banner"
              }
            >
              {error}
            </div>
          )}
          {selectedConversation ? (
            <>
              <div className="panel-header panel-header--stacked">
                <div>
                  <div className="panel-title">
                    {selectedConversation.userName}
                  </div>
                  <div className="muted small">
                    {selectedConversation.userEmail ||
                      selectedConversation.userId}{" "}
                    • unread for admin: {selectedConversation.unreadForAdmin}
                  </div>
                </div>
              </div>
              {loadingMessages ? (
                <div className="panel-empty">Loading messages...</div>
              ) : (
                <MessageList
                  items={messages}
                  currentUser={user}
                  emptyLabel="No messages in this conversation yet."
                />
              )}
              <MessageComposer
                onSend={handleSend}
                sending={sending}
                placeholder="Reply to this user..."
              />
            </>
          ) : (
            <div className="panel-empty">
              Select a conversation to start replying.
            </div>
          )}
        </div>
      }
    />
  );
}
