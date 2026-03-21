import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { authenticateHttp } from './middlewares/auth.http.js';
import meChatRoutes from './routes/meChat.routes.js';
import adminChatRoutes from './routes/adminChat.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin === '*' ? true : env.clientOrigin, credentials: true }));
  app.use(helmet());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/chat', authenticateHttp);
  app.use('/api/chat/me', meChatRoutes);
  app.use('/api/chat/admin', adminChatRoutes);

  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    });
  });

  return app;
}
