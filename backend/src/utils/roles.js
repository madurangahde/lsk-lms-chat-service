import { env } from '../config/env.js';

export function normalizeRole(role) {
  if (!role) return '';
  return String(role).trim().toUpperCase();
}

export function isAdminRole(role) {
  return env.adminRoleNames.includes(normalizeRole(role));
}

export function isAllowedUserRole(role) {
  return env.userRoleNames.includes(normalizeRole(role));
}
