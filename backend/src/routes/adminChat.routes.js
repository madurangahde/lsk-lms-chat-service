import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import {
  broadcastMessageController,
  getConversationMessagesController,
  listConversationsController,
  markAdminConversationReadController,
  sendAdminReplyController
} from '../controllers/adminChat.controller.js';

const router = Router();

router.use(requireAdmin);
router.get('/conversations', asyncHandler(listConversationsController));
router.get('/conversations/:conversationId/messages', asyncHandler(getConversationMessagesController));
router.post('/conversations/:conversationId/messages', asyncHandler(sendAdminReplyController));
router.post('/conversations/:conversationId/read', asyncHandler(markAdminConversationReadController));
router.post('/broadcast', asyncHandler(broadcastMessageController));

export default router;
