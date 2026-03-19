import { env } from '../config/env.js';
import { getCachedAuth, setCachedAuth } from '../utils/authCache.js';
import { HttpError } from '../utils/httpError.js';
import { isAdminRole, isAllowedUserRole, normalizeRole } from '../utils/roles.js';

function firstDefined(...values) {
  return values.find((v) => v !== undefined && v !== null && v !== '');
}

function extractContainer(payload) {
  return payload?.data?.user || payload?.user || payload?.data || payload;
}

export function normalizeLmsUser(payload) {
  const raw = extractContainer(payload);
  const id = String(
    firstDefined(raw?.id, raw?._id, raw?.userId, raw?.uuid, raw?.user?.id)
  );
  const email = firstDefined(raw?.email, raw?.mail, raw?.username, raw?.user?.email) || null;
  const name =
    firstDefined(raw?.name, raw?.fullName, raw?.displayName, raw?.userName, raw?.user?.name) ||
    email ||
    id;
  const roleValue = firstDefined(
    raw?.role,
    raw?.userRole,
    raw?.type,
    Array.isArray(raw?.roles) ? raw.roles[0] : null,
    raw?.user?.role
  );
  const role = normalizeRole(roleValue);

  if (!id || id === 'undefined') {
    throw new HttpError(401, 'Could not extract user id from LMS auth response', 'AUTH_MAP_FAILED');
  }
  if (!role) {
    throw new HttpError(403, 'Could not extract user role from LMS auth response', 'ROLE_MAP_FAILED');
  }
  if (!isAdminRole(role) && !isAllowedUserRole(role)) {
    throw new HttpError(403, `Role ${role} is not allowed to use chat`, 'ROLE_NOT_ALLOWED');
  }

  return {
    id,
    email,
    name,
    role,
    isAdmin: isAdminRole(role)
  };
}

async function fetchJson(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.lmsTimeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }

    if (!response.ok) {
      throw new HttpError(response.status, body?.message || 'LMS auth request failed', 'LMS_REQUEST_FAILED');
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveCurrentUserFromToken(token) {
  const cached = await getCachedAuth(token);
  if (cached) return cached;

  const body = await fetchJson(env.lmsAuthMeUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  const user = normalizeLmsUser(body);
  await setCachedAuth(token, user);
  return user;
}

function normalizeUsersArray(payload) {
  const source = payload?.data?.items || payload?.data?.content || payload?.data?.users || payload?.items || payload?.content || payload?.users || payload?.data || payload;
  if (!Array.isArray(source)) {
    throw new HttpError(500, 'LMS users list API must return an array or a page content array', 'LMS_USERS_LIST_BAD_SHAPE');
  }

  return source
    .map((item) => {
      try {
        return normalizeLmsUser(item);
      } catch {
        return null;
      }
    })
    .filter((user) => user && !user.isAdmin);
}

export async function fetchAllLmsUsers(adminToken) {
  if (!env.lmsUsersListUrl) {
    throw new HttpError(
      500,
      'LMS_USERS_LIST_URL is required for broadcast messages',
      'LMS_USERS_LIST_URL_MISSING'
    );
  }

  const body = await fetchJson(env.lmsUsersListUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Accept: 'application/json'
    }
  });

  const users = normalizeUsersArray(body);
  const deduped = new Map();
  for (const user of users) {
    deduped.set(user.id, user);
  }
  return [...deduped.values()];
}
