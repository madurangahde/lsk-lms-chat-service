import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectMongo } from './config/db.js';
import { env } from './config/env.js';
import { configureRedis } from './config/redis.js';
import { setSocketServer } from './config/socketStore.js';
import { resolveCurrentUserFromToken } from './services/lmsAuth.service.js';
import { extractTokenFromSocket } from './middlewares/auth.http.js';
import {
  assertConversationAccess,
  ensureConversationForUser,
  markAdminConversationRead,
  markMyConversationRead,
  sendAdminReply,
  sendUserMessage,
  broadcastAdminMessage
} from './services/chat.service.js';

async function bootstrap() {
  await connectMongo();

  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    path: env.socketPath,
    cors: {
      origin: env.clientOrigin === '*' ? true : env.clientOrigin,
      credentials: true
    }
  });

  await configureRedis(io);
  setSocketServer(io);

  io.use(async (socket, next) => {
    try {
      const token = extractTokenFromSocket(socket);
      if (!token) {
        return next(new Error('Missing bearer token')); 
      }
      const user = await resolveCurrentUserFromToken(token);
      socket.data.auth = { token, user };
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', async (socket) => {
    const { token, user } = socket.data.auth;

    socket.join(`user:${user.id}`);
    if (user.isAdmin) {
      socket.join('admins');
    } else {
      const conversation = await ensureConversationForUser(user);
      socket.join(`conv:${conversation._id}`);
    }

    socket.on('conversation:subscribe', async ({ conversationId }, ack) => {
      try {
        const conversation = await assertConversationAccess(user, conversationId);
        socket.join(`conv:${conversation._id}`);
        ack?.({ ok: true, conversationId: String(conversation._id) });
      } catch (error) {
        ack?.({ ok: false, message: error.message, code: error.code });
      }
    });

    socket.on('conversation:unsubscribe', async ({ conversationId }, ack) => {
      socket.leave(`conv:${conversationId}`);
      ack?.({ ok: true });
    });

    socket.on('message:user:send', async (payload, ack) => {
      try {
        if (user.isAdmin) {
          throw new Error('Admins cannot use message:user:send');
        }
        const result = await sendUserMessage(user, payload || {});
        ack?.({ ok: true, data: result });
      } catch (error) {
        ack?.({ ok: false, message: error.message, code: error.code });
      }
    });

    socket.on('message:admin:send', async ({ conversationId, text }, ack) => {
      try {
        if (!user.isAdmin) {
          throw new Error('Only admins can reply to conversations');
        }
        const result = await sendAdminReply(user, conversationId, { text });
        ack?.({ ok: true, data: result });
      } catch (error) {
        ack?.({ ok: false, message: error.message, code: error.code });
      }
    });

    socket.on('conversation:read', async ({ conversationId }, ack) => {
      try {
        let data;
        if (user.isAdmin) {
          data = await markAdminConversationRead(conversationId);
        } else {
          data = await markMyConversationRead(user);
        }
        ack?.({ ok: true, data });
      } catch (error) {
        ack?.({ ok: false, message: error.message, code: error.code });
      }
    });

    socket.on('message:broadcast', async ({ text }, ack) => {
      try {
        if (!user.isAdmin) {
          throw new Error('Only admins can broadcast');
        }
        const result = await broadcastAdminMessage(user, token, { text });
        ack?.({ ok: true, data: result });
      } catch (error) {
        ack?.({ ok: false, message: error.message, code: error.code });
      }
    });
  });

  server.listen(env.port, () => {
    console.log(`🚀 Chat service listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start chat service', error);
  process.exit(1);
});
