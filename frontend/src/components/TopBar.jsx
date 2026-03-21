import { env } from '../config/env.js';

export default function TopBar({ user, onLogout, rightSlot }) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">{env.appTitle}</div>
        <h1>{user?.isAdmin ? 'Admin Chat Console' : 'Support Chat'}</h1>
      </div>
      <div className="topbar-actions">
        <div className="user-pill">
          <span className="user-pill__name">{user?.name}</span>
          <span className="user-pill__role">{user?.role || 'USER'}</span>
        </div>
        {rightSlot}
        <button className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
