import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, default: null, index: true },
    userName: { type: String, required: true },
    lastMessageText: { type: String, default: '' },
    lastMessageSenderType: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    lastMessageAt: { type: Date, default: null, index: true },
    unreadForAdmin: { type: Number, default: 0, index: true },
    unreadForUser: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

export const Conversation = mongoose.model('Conversation', conversationSchema);
