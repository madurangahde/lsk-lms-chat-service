import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    senderType: { type: String, enum: ['USER', 'ADMIN'], required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    isBroadcast: { type: Boolean, default: false, index: true },
    broadcastId: { type: String, default: null, index: true },
    readByUser: { type: Boolean, default: false, index: true },
    readByAdmin: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
