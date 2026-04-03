# LMS Chat Frontend (React)

React frontend for the LMS chat backend you asked for.

## Stack

- React + Vite
- React Router
- Axios
- Socket.IO client
- Plain CSS

## Features

### User view

- User sees only their own conversation with admins
- User can view previous messages
- User can send new messages and replies
- User receives admin replies in real time

### Admin view

- Admin sees all user conversations separately
- Admin can search conversations
- Admin can search LMS students by name and start/open a 1:1 chat
- Admin can filter unread conversations
- Admin can open a conversation and reply in real time
- Admin can send broadcast messages to all users

## 1. Install

```bash
npm install
cp .env.example .env
npm run dev
```

## 2. Environment variables

```env
VITE_APP_TITLE=LMS Chat
VITE_CHAT_API_URL=http://localhost:8085/api/chat
VITE_CHAT_SOCKET_URL=http://localhost:8085
VITE_CHAT_SOCKET_PATH=/socket.io
VITE_AUTH_TOKEN_STORAGE_KEY=lms_access_token
VITE_AUTH_USER_STORAGE_KEY=lms_user
```

## 3. How authentication works

This frontend does **not** implement its own login.
It reuses the **existing LMS bearer token**.

### Normal LMS integration flow

Your LMS already authenticates the user and stores the token somewhere.
This frontend tries to read:

- token from localStorage/sessionStorage
- optional user JSON from localStorage/sessionStorage

The keys are configurable by:

- `VITE_AUTH_TOKEN_STORAGE_KEY`
- `VITE_AUTH_USER_STORAGE_KEY`

If those keys do not exist, update them in `.env`.

### Standalone testing flow

If you run this frontend alone, use the login page to call your LMS login API and receive an access token.
UI routing is derived from the decoded token claims.
The backend still enforces the real permissions.

## 4. Adapting to your LMS app

Most LMS apps store something like this:

```js
localStorage.setItem("lms_access_token", token);
localStorage.setItem("lms_user", JSON.stringify(user));
```

If your LMS uses different keys, update `.env`.

If your LMS user object has a different shape, you may optionally refine this file:

- `src/auth/jwt.js`

That file contains the frontend-side user normalization logic used only for UI routing and labels.

## 5. Backend endpoints used

### User

- `GET /me/conversation`
- `GET /me/messages`
- `POST /me/read`
- Socket event: `message:user:send`

### Admin

- `GET /admin/conversations`
- `GET /admin/conversations/:conversationId/messages`
- `POST /admin/conversations/:conversationId/read`
- Socket event: `message:admin:send`
- Socket event: `message:broadcast`

## 6. Socket events listened to

### Common

- `message:new`

### User

- `conversation:self:updated`

### Admin

- `conversation:updated`

## 7. Production integration suggestion

If this chat UI is part of your existing LMS React app, the cleanest approach is:

- move the relevant files into your LMS frontend
- reuse your existing auth context/token store
- mount these pages under routes such as `/chat` and `/admin/chat`

Then replace the storage bootstrap in `AuthContext` with your existing auth provider.

## 8. Folder summary

- `src/pages/UserChatPage.jsx` — user chat screen
- `src/pages/AdminChatPage.jsx` — admin chat console
- `src/auth/AuthContext.jsx` — auth bootstrap using LMS token
- `src/socket/socket.js` — Socket.IO connection
- `src/api/http.js` — Axios client with bearer token
