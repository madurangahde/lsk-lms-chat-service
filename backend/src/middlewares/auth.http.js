import { resolveCurrentUserFromToken } from '../services/lmsAuth.service.js';
import { HttpError } from '../utils/httpError.js';

function extractBearerToken(authorization) {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice('Bearer '.length).trim();
}

export async function authenticateHttp(req, _res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new HttpError(401, 'Missing bearer token', 'MISSING_BEARER_TOKEN');
    }
    const user = await resolveCurrentUserFromToken(token);
    req.auth = { token, user };
    next();
  } catch (error) {
    next(error);
  }
}

export function extractTokenFromSocket(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return String(authToken);

  const header = socket.handshake.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return null;
}
