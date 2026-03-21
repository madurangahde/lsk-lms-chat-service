import { formatDateTime } from '../utils/date.js';

export default function ConversationList({
  items,
  selectedId,
  onSelect,
  isAdmin = false,
  loading = false
}) {
  if (loading) {
    return <div className="panel-empty">Loading conversations...</div>;
  }

  if (!items.length) {
    return <div className="panel-empty">No conversations yet.</div>;
  }

  return (
    <div className="conversation-list">
      {items.map((conversation) => {
        const unreadCount = isAdmin ? conversation.unreadForAdmin : conversation.unreadForUser;
        return (
          <button
            key={conversation.id}
            className={`conversation-item ${selectedId === conversation.id ? 'is-active' : ''}`}
            onClick={() => onSelect(conversation)}
          >
            <div className="conversation-item__row">
              <strong>{conversation.userName || 'Unknown User'}</strong>
              <span className="muted small">{formatDateTime(conversation.lastMessageAt)}</span>
            </div>
            {isAdmin && <div className="muted small">{conversation.userEmail || conversation.userId}</div>}
            <div className="conversation-item__row conversation-item__preview">
              <span>{conversation.lastMessageText || 'No messages yet'}</span>
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
