import { Router } from "express";
import { z } from "zod";
import {
  createChannel,
  createMessage,
  getOrCreateDirectMessage,
  listChannels,
  listMessages
} from "../services/channels.js";
import { notificationQueue } from "../queues/notifications.js";
import { Channel } from "../models/Channel.js";
import type { AuthedRequest } from "../types.js";

export const channelsRouter = Router();

const createChannelSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  type: z.enum(["channel", "group"]).default("channel"),
  isPrivate: z.boolean().default(false),
  memberIds: z.array(z.string()).default([])
});

const messageSchema = z.object({
  body: z.string().max(8000).default(""),
  attachments: z
    .array(
      z.object({
        url: z.string(),
        name: z.string(),
        mimeType: z.string(),
        size: z.number()
      })
    )
    .default([])
});

channelsRouter.get("/channels", async (req, res) => {
  const channels = await listChannels((req as AuthedRequest).user.id);
  res.json({ channels });
});

channelsRouter.post("/channels", async (req, res) => {
  const body = createChannelSchema.parse(req.body);
  const channel = await createChannel({ ...body, owner: (req as AuthedRequest).user });
  res.status(201).json({ channel });
});

channelsRouter.post("/direct-messages", async (req, res) => {
  const body = z.object({ memberId: z.string().min(1) }).parse(req.body);
  const channel = await getOrCreateDirectMessage((req as AuthedRequest).user, body.memberId);
  res.status(201).json({ channel });
});

channelsRouter.get("/channels/:channelId/messages", async (req, res) => {
  const messages = await listMessages(
    req.params.channelId,
    (req as unknown as AuthedRequest).user.id,
    typeof req.query.before === "string" ? req.query.before : undefined
  );
  res.json({ messages: messages.reverse() });
});

channelsRouter.post("/channels/:channelId/messages", async (req, res) => {
  const body = messageSchema.parse(req.body);
  const user = (req as unknown as AuthedRequest).user;
  const message = await createMessage({
    channelId: req.params.channelId,
    sender: user,
    body: body.body,
    attachments: body.attachments
  });
  const channel = await Channel.findById(req.params.channelId).lean();
  if (channel) {
    await notificationQueue.add("message-created", {
      channelId: req.params.channelId,
      senderId: user.id,
      senderName: user.name,
      memberIds: channel.memberIds,
      body: body.body
    });
  }
  res.status(201).json({ message });
});
