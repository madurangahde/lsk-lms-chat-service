export const env = {
  appTitle: import.meta.env.VITE_APP_TITLE || "LMS Chat",

  apiUrl: (
    import.meta.env.VITE_CHAT_API_URL || "http://localhost:8085/api/chat"
  ).replace(/\/$/, ""),
  socketUrl: (
    import.meta.env.VITE_CHAT_SOCKET_URL || "http://localhost:8085"
  ).replace(/\/$/, ""),
  socketPath: import.meta.env.VITE_CHAT_SOCKET_PATH || "/socket.io",

  tokenStorageKey:
    import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY || "lms_access_token",
  userStorageKey: import.meta.env.VITE_AUTH_USER_STORAGE_KEY || "lms_user",

  lmsLoginUrl:
    import.meta.env.VITE_LMS_LOGIN_URL ||
    "http://localhost:8080/api/auth/login",
  lmsLoginIdentifierField:
    import.meta.env.VITE_LMS_LOGIN_IDENTIFIER_FIELD || "email",
  lmsLoginPasswordField:
    import.meta.env.VITE_LMS_LOGIN_PASSWORD_FIELD || "password",
  lmsLoginIdentifierLabel:
    import.meta.env.VITE_LMS_LOGIN_IDENTIFIER_LABEL || "Email",
};
