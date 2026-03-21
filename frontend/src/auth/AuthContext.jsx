import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, persistSession, readSession } from './authStorage.js';
import { normalizeFrontendUser } from './jwt.js';
import { closeSocket } from '../socket/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = readSession();
    if (session?.token) {
      setToken(session.token);
      setUser(session.user);
    }
    setLoading(false);
  }, []);

  const login = ({ token: nextToken, roleHint, nameHint, emailHint, storedUser }) => {
    const normalizedUser = normalizeFrontendUser({
      token: nextToken,
      storedUser,
      roleHint,
      nameHint,
      emailHint
    });

    const session = { token: nextToken, user: normalizedUser };
    setToken(nextToken);
    setUser(normalizedUser);
    persistSession(session);
    return session;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    clearSession();
    closeSocket();
  };

  const value = useMemo(
    () => ({
      loading,
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
