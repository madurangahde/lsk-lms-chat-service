import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";
import { fetchAllLmsUsers, searchLmsUsers } from "./lmsAuth.service.js";
import { getSocketServer } from "../config/socketStore.js";

function toMessageDto(doc) {
  return {
    id: String(doc._id),
    conversationId: String(doc.conversationId),
    senderType: doc.senderType,
    senderId: doc.senderId,
    senderName: doc.senderName,
    text: doc.text,
    isBroadcast: !!doc.isBroadcast,
    broadcastId: doc.broadcastId || null,
    readByUser: !!doc.readByUser,
    readByAdmin: !!doc.readByAdmin,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toConversationDto(doc) {
  return {
    id: String(doc._id),
    userId: doc.userId,
    userEmail: doc.userEmail,
    userName: doc.userName,
    lastMessageText: doc.lastMessageText,
    lastMessageSenderType: doc.lastMessageSenderType,
    lastMessageAt: doc.lastMessageAt,
    unreadForAdmin: doc.unreadForAdmin,
    unreadForUser: doc.unreadForUser,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizeText(text) {
  const value = String(text || "").trim();
  if (!value) {
    throw new HttpError(
      400,
      "Message text is required",
      "MESSAGE_TEXT_REQUIRED",
    );
  }
  if (value.length > env.maxMessageLength) {
    throw new HttpError(
      400,
      `Message exceeds ${env.maxMessageLength} characters`,
      "MESSAGE_TOO_LONG",
    );
  }
  return value;
}

function normalizeConversationTarget(payload) {
  const id = String(
    payload?.id || payload?.userId || payload?.username || payload?.email || "",
  ).trim();
  const email = String(payload?.email || "").trim() || null;
  const name = String(payload?.name || payload?.userName || "").trim();

  if (!id) {
    throw new HttpError(400, "Target user id is required", "USER_ID_REQUIRED");
  }
  if (!name) {
    throw new HttpError(
      400,
      "Target user name is required",
      "USER_NAME_REQUIRED",
    );
  }

  return { id, email, name };
}

function emitConversationToAdmins(conversation) {
  const io = getSocketServer();
  if (io) {
    io.to("admins").emit("conversation:updated", conversation);
  }
}

function emitMessageToConversation(conversationId, message) {
  const io = getSocketServer();
  if (io) {
    io.to(`conv:${conversationId}`).emit("message:new", message);
  }
}

function emitUserConversationSummary(userId, conversation) {
  const io = getSocketServer();
  if (io) {
    io.to(`user:${userId}`).emit("conversation:self:updated", conversation);
  }
}

export async function ensureConversationForUser(user) {
  const conversation = await Conversation.findOneAndUpdate(
    { userId: user.id },
    {
      $setOnInsert: {
        userId: user.id,
      },
      $set: {
        userEmail: user.email,
        userName: user.name,
      },
    },
    { upsert: true, new: true },
  );

  return conversation;
}

export async function getMyConversation(authUser) {
  const conversation = await ensureConversationForUser(authUser);
  return toConversationDto(conversation);
}

export async function getConversationOrThrow(conversationId) {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new HttpError(400, "Invalid conversation id", "BAD_CONVERSATION_ID");
  }
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new HttpError(
      404,
      "Conversation not found",
      "CONVERSATION_NOT_FOUND",
    );
  }
  return conversation;
}

export async function assertConversationAccess(authUser, conversationId) {
  const conversation = await getConversationOrThrow(conversationId);
  if (!authUser.isAdmin && conversation.userId !== authUser.id) {
    throw new HttpError(
      403,
      "You cannot access this conversation",
      "FORBIDDEN_CONVERSATION",
    );
  }
  return conversation;
}

export async function getMyMessages(authUser, { before, limit }) {
  const conversation = await ensureConversationForUser(authUser);
  return getConversationMessages(conversation._id, { before, limit });
}

export async function getConversationMessages(
  conversationId,
  { before, limit },
) {
  const query = { conversationId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const rows = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const ordered = rows.reverse().map(toMessageDto);
  const nextBefore = rows.length
    ? rows[rows.length - 1].createdAt.toISOString()
    : null;

  return {
    items: ordered,
    nextBefore: rows.length === limit ? nextBefore : null,
  };
}

export async function sendUserMessage(authUser, payload) {
  const text = sanitizeText(payload.text);
  const conversation = await ensureConversationForUser(authUser);

  const message = await Message.create({
    conversationId: conversation._id,
    senderType: "USER",
    senderId: authUser.id,
    senderName: authUser.name,
    text,
    readByUser: true,
    readByAdmin: false,
    isBroadcast: false,
  });

  conversation.lastMessageText = text;
  conversation.lastMessageSenderType = "USER";
  conversation.lastMessageAt = message.createdAt;
  conversation.unreadForAdmin += 1;
  await conversation.save();

  const conversationDto = toConversationDto(conversation);
  const messageDto = toMessageDto(message);

  emitMessageToConversation(conversation._id, messageDto);
  emitConversationToAdmins(conversationDto);
  emitUserConversationSummary(authUser.id, conversationDto);

  return { conversation: conversationDto, message: messageDto };
}

export async function sendAdminReply(authUser, conversationId, payload) {
  const text = sanitizeText(payload.text);
  const conversation = await getConversationOrThrow(conversationId);

  const message = await Message.create({
    conversationId: conversation._id,
    senderType: "ADMIN",
    senderId: authUser.id,
    senderName: authUser.name,
    text,
    readByUser: false,
    readByAdmin: true,
    isBroadcast: false,
  });

  conversation.lastMessageText = text;
  conversation.lastMessageSenderType = "ADMIN";
  conversation.lastMessageAt = message.createdAt;
  conversation.unreadForUser += 1;
  conversation.unreadForAdmin = 0;
  await conversation.save();

  const conversationDto = toConversationDto(conversation);
  const messageDto = toMessageDto(message);

  emitMessageToConversation(conversation._id, messageDto);
  emitConversationToAdmins(conversationDto);
  emitUserConversationSummary(conversation.userId, conversationDto);

  return { conversation: conversationDto, message: messageDto };
}

export async function markMyConversationRead(authUser) {
  const conversation = await ensureConversationForUser(authUser);
  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderType: "ADMIN",
      readByUser: false,
    },
    { $set: { readByUser: true } },
  );
  conversation.unreadForUser = 0;
  await conversation.save();

  const dto = toConversationDto(conversation);
  emitUserConversationSummary(authUser.id, dto);
  emitConversationToAdmins(dto);
  return dto;
}

export async function markAdminConversationRead(conversationId) {
  const conversation = await getConversationOrThrow(conversationId);
  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderType: "USER",
      readByAdmin: false,
    },
    { $set: { readByAdmin: true } },
  );
  conversation.unreadForAdmin = 0;
  await conversation.save();

  const dto = toConversationDto(conversation);
  emitConversationToAdmins(dto);
  return dto;
}

export async function listAdminConversations({
  page,
  limit,
  search,
  onlyUnread,
}) {
  const query = {};
  if (search) {
    query.$or = [
      { userName: { $regex: search, $options: "i" } },
      { userEmail: { $regex: search, $options: "i" } },
      { userId: { $regex: search, $options: "i" } },
    ];
  }
  if (onlyUnread) {
    query.unreadForAdmin = { $gt: 0 };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Conversation.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(query),
  ]);

  return {
    items: items.map(toConversationDto),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function searchAdminStudents(token, { search, page, limit }) {
  const result = await searchLmsUsers(token, {
    search,
    page: Math.max(page - 1, 0),
    size: limit,
  });

  const ids = result.items.map((item) => item.id);
  const existingConversations = ids.length
    ? await Conversation.find({ userId: { $in: ids } })
        .select("_id userId")
        .lean()
    : [];
  const byUserId = new Map(
    existingConversations.map((row) => [row.userId, String(row._id)]),
  );

  return {
    items: result.items.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      role: item.role,
      conversationId: byUserId.get(item.id) || null,
    })),
    page: result.page + 1,
    limit: result.size,
    total: result.total,
    totalPages: result.totalPages,
  };
}

export async function startAdminConversation(payload) {
  const target = normalizeConversationTarget(payload);
  const conversation = await ensureConversationForUser(target);
  return toConversationDto(conversation);
}

export async function broadcastAdminMessage(authUser, token, payload) {
  const text = sanitizeText(payload.text);
  const users = await fetchAllLmsUsers(token);
  const broadcastId = new mongoose.Types.ObjectId().toString();

  if (!users.length) {
    return { broadcastId, deliveredUsers: 0 };
  }

  const now = new Date();
  const chunkSize = 500;
  let deliveredUsers = 0;

  for (let i = 0; i < users.length; i += chunkSize) {
    const batch = users.slice(i, i + chunkSize);
    await Conversation.bulkWrite(
      batch.map((user) => ({
        updateOne: {
          filter: { userId: user.id },
          update: {
            $setOnInsert: {
              userId: user.id,
            },
            $set: {
              userEmail: user.email,
              userName: user.name,
              lastMessageText: text,
              lastMessageSenderType: "ADMIN",
              lastMessageAt: now,
            },
            $inc: { unreadForUser: 1 },
          },
          upsert: true,
        },
      })),
    );

    const conversations = await Conversation.find({
      userId: { $in: batch.map((user) => user.id) },
    });

    const byUserId = new Map(
      conversations.map((conversation) => [conversation.userId, conversation]),
    );
    const messages = batch
      .map((user) => {
        const conversation = byUserId.get(user.id);
        if (!conversation) return null;
        return {
          conversationId: conversation._id,
          senderType: "ADMIN",
          senderId: authUser.id,
          senderName: authUser.name,
          text,
          isBroadcast: true,
          broadcastId,
          readByAdmin: true,
          readByUser: false,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter(Boolean);

    if (messages.length) {
      await Message.insertMany(messages);
      deliveredUsers += messages.length;
    }

    const io = getSocketServer();
    if (io) {
      for (const user of batch) {
        const conversation = byUserId.get(user.id);
        if (!conversation) continue;
        const conversationDto = toConversationDto(conversation);
        const messageDoc = messages.find(
          (m) => String(m.conversationId) === String(conversation._id),
        );
        emitConversationToAdmins(conversationDto);
        emitUserConversationSummary(user.id, conversationDto);
        if (messageDoc) {
          emitMessageToConversation(conversation._id, {
            id: `${broadcastId}:${conversation._id}`,
            conversationId: String(conversation._id),
            senderType: "ADMIN",
            senderId: authUser.id,
            senderName: authUser.name,
            text,
            isBroadcast: true,
            broadcastId,
            readByUser: false,
            readByAdmin: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
  }

  return { broadcastId, deliveredUsers };
}
