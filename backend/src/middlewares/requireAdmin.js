import { HttpError } from '../utils/httpError.js';

export function requireAdmin(req, _res, next) {
  if (!req.auth?.user?.isAdmin) {
    return next(new HttpError(403, 'Admin only', 'ADMIN_ONLY'));
  }
  next();
}
