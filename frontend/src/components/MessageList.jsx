import { useEffect, useRef } from 'react';
import { formatDateTime, formatTime } from '../utils/date.js';

export default function MessageList({ items, currentUser, emptyLabel = 'No messages yet.' }) {
  const scrollerRef = useRef(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [items]);

  if (!items.length) {
    return <div className="panel-empty">{emptyLabel}</div>;
  }

  return (
    <div ref={scrollerRef} className="message-list">
      {items.map((message) => {
        const mine = message.senderId === currentUser?.id || (currentUser?.isAdmin && message.senderType === 'ADMIN');
        return (
          <div key={message.id} className={`message-row ${mine ? 'mine' : 'theirs'}`}>
            <div className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>
              <div className="message-meta">
                <strong>{message.senderName}</strong>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              {message.isBroadcast && <div className="message-tag">Broadcast</div>}
              <p>{message.text}</p>
              <div className="message-footer">{formatDateTime(message.createdAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
