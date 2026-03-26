import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, persistSession, readSession } from "./authStorage.js";
import { normalizeFrontendUser, parseJwt, isJwtExpired } from "./jwt.js";
import { closeSocket } from "../socket/socket.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = readSession();
    if (session?.token && !isJwtExpired(session.token)) {
      setToken(session.token);
      setUser(session.user);
    } else if (session?.token) {
      clearSession();
    }
    setLoading(false);
  }, []);

  const login = ({
    token: nextToken,
    roleHint,
    nameHint,
    emailHint,
    storedUser,
  }) => {
    if (!nextToken || isJwtExpired(nextToken)) {
      throw new Error(
        "Login token is missing or expired. Please sign in again.",
      );
    }

    const claims = parseJwt(nextToken);
    console.log("[Auth] Access token:", nextToken);
    console.log("[Auth] JWT claims:", claims);

    const normalizedUser = normalizeFrontendUser({
      token: nextToken,
      storedUser,
      roleHint,
      nameHint,
      emailHint,
    });

    const session = { token: nextToken, user: normalizedUser };
    setToken(nextToken);
    setUser(normalizedUser);
    persistSession(session);
    return session;
  };

  const logout = () => {
    setToken("");
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
      logout,
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
