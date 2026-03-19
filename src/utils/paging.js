import { env } from '../config/env.js';

export function normalizeLimit(limit) {
  const parsed = Number(limit || env.defaultPageSize);
  return Math.min(Math.max(parsed, 1), env.maxPageSize);
}
