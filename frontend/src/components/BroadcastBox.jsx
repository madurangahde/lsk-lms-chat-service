import { useState } from 'react';

export default function BroadcastBox({ onBroadcast, sending = false }) {
  const [text, setText] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    const ok = await onBroadcast(value);
    if (ok) {
      setText('');
    }
  };

  return (
    <div className="broadcast-box">
      <div>
        <div className="panel-title">Broadcast to all users</div>
        <div className="muted small">Sends one admin message into every user conversation.</div>
      </div>
      <form className="broadcast-form" onSubmit={submit}>
        <textarea
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write a system-wide announcement for all users..."
        />
        <button className="btn btn-danger" disabled={sending || !text.trim()} type="submit">
          {sending ? 'Broadcasting...' : 'Broadcast'}
        </button>
      </form>
    </div>
  );
}
