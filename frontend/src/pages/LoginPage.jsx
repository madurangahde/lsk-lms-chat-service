import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { env } from '../config/env.js';

export default function LoginPage() {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState('');
  const [role, setRole] = useState('USER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.isAdmin ? '/admin' : '/chat', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!token.trim()) {
      setError('Paste your LMS bearer token to continue.');
      return;
    }

    login({
      token: token.trim(),
      roleHint: role,
      nameHint: name,
      emailHint: email
    });

    const redirectTo = location.state?.from?.pathname;
    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="eyebrow">{env.appTitle}</div>
        <h1>Connect to chat</h1>
        <p className="muted">
          In your LMS integration, this screen is usually skipped because the app auto-reads the saved token
          from localStorage or sessionStorage. For standalone testing, paste a valid LMS token here.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Bearer token</span>
            <textarea
              rows={6}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste LMS access token"
            />
          </label>

          <div className="login-grid">
            <label>
              <span>Role hint</span>
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <label>
              <span>Name hint</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" />
            </label>
          </div>

          <label>
            <span>Email hint</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Optional" />
          </label>

          {error && <div className="error-banner">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit">
            Enter chat
          </button>
        </form>

        <div className="login-help muted small">
          Configure <code>VITE_AUTH_TOKEN_STORAGE_KEY</code> and <code>VITE_AUTH_USER_STORAGE_KEY</code> if your
          LMS stores auth data under different keys.
        </div>
      </div>
    </div>
  );
}
