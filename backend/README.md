# LMS Chat Service (Node.js + Socket.IO + MongoDB Atlas)

This service gives you:

- user can chat only with admins
- user sees only their own chat thread
- admin sees all user threads separately
- admin can reply to each conversation
- admin can broadcast a message to all LMS users
- authentication is delegated to your existing LMS APIs
- MongoDB Atlas stores conversations/messages
- Redis is optional for multi-container Socket.IO scaling and short-lived auth caching

## 1) How authentication works here

This chat service **does not manage login/passwords**.

Instead:

1. Frontend gets the normal LMS bearer token from your existing LMS login flow.
2. Frontend sends that same token to this chat service:
   - HTTP: `Authorization: Bearer <token>`
   - Socket.IO: `auth: { token }`
3. The chat service decodes claims from the access token payload and builds the user profile from those claims.
4. The service normalizes token claims into:
   ```json
   {
     "id": "...",
     "email": "...",
     "name": "...",
     "role": "ADMIN or USER",
     "isAdmin": true/false
   }
   ```
5. Authorization is enforced from that normalized profile:
   - normal user => only own conversation
   - admin => all conversations + broadcast

### LMS APIs this service expects

You must point these env variables to your real LMS APIs:

- `LMS_USERS_LIST_URL` -> admin API that returns **all users** for broadcast fan-out

If your token claims shape is different, update:

- `normalizeLmsUser()` in `src/services/lmsAuth.service.js`

If your LMS users list response shape is different, update:

- `normalizeUsersArray()` in `src/services/lmsAuth.service.js`

## 2) Project structure

```text
lms-chat-service/
├─ src/
│  ├─ config/
│  ├─ controllers/
│  ├─ middlewares/
│  ├─ models/
│  ├─ routes/
│  ├─ services/
│  └─ utils/
├─ Dockerfile
├─ docker-compose.yml
├─ .env.example
└─ package.json
```

## 3) Install and run locally

```bash
npm install
cp .env.example .env
# edit .env
npm run dev
```

## 4) MongoDB Atlas setup

Create an Atlas cluster and place the full connection string in:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/lms_chat?retryWrites=true&w=majority
```

## 5) Optional Redis setup

### When you should use Redis

Use Redis if you will run **more than one chat-service container**.

Benefits in this implementation:

- Socket.IO events fan out correctly across multiple containers
- short-lived auth cache can be shared

### Simple Redis via Docker

```bash
docker compose up redis -d
```

Or full stack:

```bash
docker compose up --build
```

If using Redis, set:

```env
USE_REDIS=true
REDIS_URL=redis://localhost:6379
```

## 6) REST APIs

All endpoints require `Authorization: Bearer <lms_access_token>`.

### User APIs

#### Get / create own conversation metadata

```http
GET /api/chat/me/conversation
```

#### Get own messages

```http
GET /api/chat/me/messages?limit=20&before=2026-03-19T10:00:00.000Z
```

#### Send message as user

```http
POST /api/chat/me/messages
Content-Type: application/json

{
  "text": "Hello admin, I need help with my package"
}
```

#### Mark admin messages as read

```http
POST /api/chat/me/read
```

### Admin APIs

#### List all conversations

```http
GET /api/chat/admin/conversations?page=1&limit=20&search=sanjula&onlyUnread=true
```

#### Get one conversation's messages

```http
GET /api/chat/admin/conversations/:conversationId/messages?limit=20
```

#### Reply to one conversation

```http
POST /api/chat/admin/conversations/:conversationId/messages
Content-Type: application/json

{
  "text": "Hi, I checked your issue and fixed it."
}
```

#### Mark one conversation as read for admin

```http
POST /api/chat/admin/conversations/:conversationId/read
```

#### Broadcast to all users

```http
POST /api/chat/admin/broadcast
Content-Type: application/json

{
  "text": "System maintenance tonight from 10 PM to 10:30 PM."
}
```

## 7) Socket.IO usage

Connect with the LMS bearer token:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:8085", {
  path: "/socket.io",
  auth: {
    token: lmsAccessToken,
  },
});
```

### Server -> client events

- `message:new`
- `conversation:updated`
- `conversation:self:updated`

### Client -> server events

#### User send

```js
socket.emit("message:user:send", { text: "Hello admin" }, console.log);
```

#### Admin reply

```js
socket.emit(
  "message:admin:send",
  {
    conversationId,
    text: "Hello user",
  },
  console.log,
);
```

#### Subscribe admin to a conversation room

```js
socket.emit("conversation:subscribe", { conversationId }, console.log);
```

#### Mark read

```js
socket.emit("conversation:read", { conversationId }, console.log);
```

#### Broadcast

```js
socket.emit("message:broadcast", { text: "Attention all users" }, console.log);
```

## 8) Important behavior rules implemented

### User restrictions

- user cannot open any conversation except their own
- user cannot see other users' messages
- user can only send in their own thread
- user automatically joins only their own room

### Admin capabilities

- admin can list all user threads
- admin can open/reply to any thread
- admin gets conversation updates in the `admins` room
- admin can broadcast to all users returned by the LMS users API

## 9) What to adapt for your LMS

Most likely you only need to adapt 2 places:

### A) token claims mapping

File: `src/services/lmsAuth.service.js`

Edit `normalizeLmsUser()` to match your LMS access token claims.

### B) all users list response mapping

File: `src/services/lmsAuth.service.js`

Edit `normalizeUsersArray()` to match your LMS admin users list response.

## 10) Suggested production notes

- keep message length limited
- add rate limiting for spam protection
- add attachment support later using S3 / Cloudinary / MinIO
- if multiple chat-service replicas are used, enable Redis and sticky sessions at ingress/load balancer
- use HTTPS in production
