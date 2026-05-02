import { Channel } from "../models/Channel.js";
import { Message } from "../models/Message.js";
import type { Attachment, AuthUser } from "../types.js";

export async function listChannels(userId: string) {
  return Channel.find({ memberIds: userId }).sort({ lastMessageAt: -1, createdAt: -1 }).lean();
}

export async function createChannel(input: {
  name: string;
  description?: string;
  type?: "channel" | "group" | "dm";
  isPrivate?: boolean;
  owner: AuthUser;
  memberIds?: string[];
}) {
  const memberIds = Array.from(new Set([input.owner.id, ...(input.memberIds ?? [])]));
  return Channel.create({
    name: input.name,
    description: input.description,
    type: input.type ?? "channel",
    isPrivate: input.isPrivate ?? false,
    ownerId: input.owner.id,
    memberIds
  });
}

export async function getOrCreateDirectMessage(owner: AuthUser, otherUserId: string) {
  const members = [owner.id, otherUserId].sort();
  const existing = await Channel.findOne({
    type: "dm",
    memberIds: { $all: members, $size: 2 }
  });

  if (existing) return existing;

  return Channel.create({
    name: "Direct message",
    type: "dm",
    isPrivate: true,
    ownerId: owner.id,
    memberIds: members
  });
}

export async function ensureMember(channelId: string, userId: string) {
  const channel = await Channel.findOne({ _id: channelId, memberIds: userId });
  if (!channel) {
    const error = new Error("Channel not found");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  return channel;
}

export async function listMessages(channelId: string, userId: string, before?: string) {
  await ensureMember(channelId, userId);
  const query = before ? { channelId, createdAt: { $lt: new Date(before) } } : { channelId };
  return Message.find(query).sort({ createdAt: -1 }).limit(50).lean();
}

export async function createMessage(input: {
  channelId: string;
  sender: AuthUser;
  body?: string;
  attachments?: Attachment[];
}) {
  await ensureMember(input.channelId, input.sender.id);
  const message = await Message.create({
    channelId: input.channelId,
    senderId: input.sender.id,
    senderName: input.sender.name,
    body: input.body ?? "",
    attachments: input.attachments ?? [],
    readBy: [input.sender.id]
  });

  await Channel.findByIdAndUpdate(input.channelId, { $set: { lastMessageAt: new Date() } });
  return message;
}
