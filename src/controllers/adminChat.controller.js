import {
  broadcastAdminMessage,
  getConversationMessages,
  listAdminConversations,
  markAdminConversationRead,
  sendAdminReply,
  assertConversationAccess
} from '../services/chat.service.js';
import { normalizeLimit } from '../utils/paging.js';

export async function listConversationsController(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = normalizeLimit(req.query.limit);
  const search = String(req.query.search || '').trim();
  const onlyUnread = String(req.query.onlyUnread || 'false').toLowerCase() === 'true';

  const data = await listAdminConversations({ page, limit, search, onlyUnread });
  res.json(data);
}

export async function getConversationMessagesController(req, res) {
  await assertConversationAccess(req.auth.user, req.params.conversationId);
  const data = await getConversationMessages(req.params.conversationId, {
    before: req.query.before,
    limit: normalizeLimit(req.query.limit)
  });
  res.json(data);
}

export async function sendAdminReplyController(req, res) {
  const data = await sendAdminReply(req.auth.user, req.params.conversationId, req.body || {});
  res.status(201).json(data);
}

export async function markAdminConversationReadController(req, res) {
  const data = await markAdminConversationRead(req.params.conversationId);
  res.json(data);
}

export async function broadcastMessageController(req, res) {
  const data = await broadcastAdminMessage(req.auth.user, req.auth.token, req.body || {});
  res.status(201).json(data);
}
