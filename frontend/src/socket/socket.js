import { io } from 'socket.io-client';
import { env } from '../config/env.js';

let socket = null;
let activeToken = '';

export function getSocket(token) {
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
    transports: ['websocket', 'polling'],
    auth: {
      token
    }
  });

  return socket;
}

export function connectSocket(token) {
  const instance = getSocket(token);
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
  activeToken = '';
}
