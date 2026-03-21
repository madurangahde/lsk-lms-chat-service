import { useState } from 'react';

export default function MessageComposer({ onSend, sending = false, placeholder = 'Type your message...' }) {
  const [text, setText] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    const ok = await onSend(value);
    if (ok) {
      setText('');
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        className="composer__input"
        rows={3}
        placeholder={placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="composer__actions">
        <span className="muted small">Shift+Enter for a new line</span>
        <button className="btn btn-primary" type="submit" disabled={sending || !text.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
}
