import dotenv from "dotenv";

dotenv.config();

const toList = (value, fallback) =>
  (value || fallback)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.toUpperCase());

export const env = {
  port: Number(process.env.PORT || 8085),
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "*",
  socketPath: process.env.SOCKET_PATH || "/socket.io",
  mongoUri: process.env.MONGODB_URI,
  lmsUsersListUrl: process.env.LMS_USERS_LIST_URL,
  lmsStudentsSearchUrl:
    process.env.LMS_STUDENTS_SEARCH_URL || process.env.LMS_USERS_LIST_URL,
  lmsTimeoutMs: Number(process.env.LMS_TIMEOUT_MS || 5000),
  adminRoleNames: toList(process.env.ADMIN_ROLE_NAMES, "ADMIN,SUPER_ADMIN"),
  userRoleNames: toList(process.env.USER_ROLE_NAMES, "USER,STUDENT"),
  authCacheTtlSeconds: Number(process.env.AUTH_CACHE_TTL_SECONDS || 60),
  maxMessageLength: Number(process.env.MAX_MESSAGE_LENGTH || 4000),
  defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE || 20),
  maxPageSize: Number(process.env.MAX_PAGE_SIZE || 100),
  useRedis: String(process.env.USE_REDIS || "false").toLowerCase() === "true",
  redisUrl: process.env.REDIS_URL || "",
};

if (!env.mongoUri) {
  throw new Error("MONGODB_URI is required");
}
