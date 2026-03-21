import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getMyConversationController,
  getMyMessagesController,
  markMyConversationReadController,
  sendMyMessageController
} from '../controllers/meChat.controller.js';

const router = Router();

router.get('/conversation', asyncHandler(getMyConversationController));
router.get('/messages', asyncHandler(getMyMessagesController));
router.post('/messages', asyncHandler(sendMyMessageController));
router.post('/read', asyncHandler(markMyConversationReadController));

export default router;
