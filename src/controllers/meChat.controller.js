import { getMyConversation, getMyMessages, markMyConversationRead, sendUserMessage } from '../services/chat.service.js';
import { normalizeLimit } from '../utils/paging.js';

export async function getMyConversationController(req, res) {
  const data = await getMyConversation(req.auth.user);
  res.json(data);
}

export async function getMyMessagesController(req, res) {
  const data = await getMyMessages(req.auth.user, {
    before: req.query.before,
    limit: normalizeLimit(req.query.limit)
  });
  res.json(data);
}

export async function sendMyMessageController(req, res) {
  const data = await sendUserMessage(req.auth.user, req.body || {});
  res.status(201).json(data);
}

export async function markMyConversationReadController(req, res) {
  const data = await markMyConversationRead(req.auth.user);
  res.json(data);
}
