import { io } from "socket.io-client";
import { env } from "../config/env.js";

let socket = null;
let activeToken = "";

export function getSocket(token) {
  if (!token) {
    return null;
  }

  if (socket && activeToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  activeToken = token;
  socket = io(env.socketUrl, {
    path: env.socketPath,
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 8000,
    auth: {
      token,
    },
  });

  socket.on("connect_error", (error) => {
    const status = error?.data?.status;
    const message = String(error?.message || "").toLowerCase();
    const isAuthError =
      status === 401 ||
      message.includes("missing bearer token") ||
      message.includes("expired") ||
      message.includes("invalid bearer token") ||
      message.includes("role");

    if (isAuthError && socket) {
      socket.io.opts.reconnection = false;
    }
  });

  return socket;
}

export function connectSocket(token) {
  const instance = getSocket(token);
  if (!instance) return null;
  if (!instance.connected) {
    instance.connect();
  }
  return instance;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
  }
  socket = null;
  activeToken = "";
}
