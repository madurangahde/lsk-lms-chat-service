import { env } from '../config/env.js';
import { normalizeFrontendUser } from './jwt.js';

const APP_SESSION_KEY = 'lms_chat_frontend_session';

const TOKEN_KEYS = [env.tokenStorageKey, 'accessToken', 'token', 'authToken', 'jwt', 'jwtToken'];
const USER_KEYS = [env.userStorageKey, 'user', 'authUser', 'currentUser', 'lms_user'];

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readFirstStorageValue(keys) {
  for (const key of keys) {
    const fromLocal = localStorage.getItem(key);
    if (fromLocal) return fromLocal;
    const fromSession = sessionStorage.getItem(key);
    if (fromSession) return fromSession;
  }
  return '';
}

export function readSession() {
  const saved = safeJsonParse(localStorage.getItem(APP_SESSION_KEY));
  if (saved?.token) {
    return saved;
  }

  const token = readFirstStorageValue(TOKEN_KEYS);
  if (!token) return null;

  const rawUser = safeJsonParse(readFirstStorageValue(USER_KEYS));
  const user = normalizeFrontendUser({ token, storedUser: rawUser });
  return { token, user };
}

export function persistSession(session) {
  localStorage.setItem(APP_SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(APP_SESSION_KEY);
}
