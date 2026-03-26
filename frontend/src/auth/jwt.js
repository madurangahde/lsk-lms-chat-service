function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}

export function parseJwt(token) {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
}

export function isJwtExpired(token, skewSeconds = 5) {
  const claims = parseJwt(token);
  if (!claims || typeof claims.exp !== "number") return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return nowInSeconds >= claims.exp - skewSeconds;
}

function pickRole(claims, userLike) {
  const rawRoles = [
    userLike?.role,
    userLike?.userRole,
    claims?.role,
    claims?.userRole,
    claims?.type,
    Array.isArray(claims?.roles) ? claims.roles[0] : claims?.roles,
    Array.isArray(claims?.authorities)
      ? claims.authorities[0]
      : claims?.authorities,
    Array.isArray(userLike?.roles) ? userLike.roles[0] : userLike?.roles,
  ];

  const first = rawRoles.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
  return first ? String(first).toUpperCase() : "";
}

export function normalizeFrontendUser({
  token,
  storedUser,
  roleHint,
  nameHint,
  emailHint,
}) {
  const claims = parseJwt(token) || {};
  const role = (roleHint || pickRole(claims, storedUser) || "").toUpperCase();
  const id = String(
    storedUser?.id ||
      storedUser?._id ||
      storedUser?.userId ||
      claims?.sub ||
      claims?.userId ||
      claims?.id ||
      claims?.uid ||
      claims?.email ||
      emailHint ||
      "unknown-user",
  );
  const email =
    storedUser?.email || storedUser?.mail || claims?.email || emailHint || "";
  const name =
    storedUser?.name ||
    storedUser?.fullName ||
    storedUser?.displayName ||
    storedUser?.userName ||
    claims?.name ||
    claims?.preferred_username ||
    claims?.email ||
    nameHint ||
    email ||
    id;

  return {
    id,
    email,
    name,
    role,
    isAdmin: role.includes("ADMIN"),
  };
}
