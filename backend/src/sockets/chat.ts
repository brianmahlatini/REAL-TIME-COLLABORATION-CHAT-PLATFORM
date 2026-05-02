import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { logger } from "../config/logger.js";
import { redis, redisPub, redisSub } from "../database/redis.js";
import { Channel } from "../models/Channel.js";
import { Message } from "../models/Message.js";
import { notificationQueue } from "../queues/notifications.js";
import { createMessage, ensureMember } from "../services/channels.js";
import { setUserPresence } from "../services/users.js";
import { authFromSocket } from "../middleware/auth.js";
import type { AuthUser } from "../types.js";

const instanceId = randomUUID();
const redisMessageTopic = "chat:message:new";
const messageSchema = z.object({
  channelId: z.string(),
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

type AuthedSocket = Socket & { user: AuthUser };

const sendWindows = new Map<string, number[]>();

function throttle(userId: string) {
  const now = Date.now();
  const windowStart = now - 10_000;
  const previous = sendWindows.get(userId)?.filter((time) => time > windowStart) ?? [];
  if (previous.length >= 20) return false;
  previous.push(now);
  sendWindows.set(userId, previous);
  return true;
}

export function attachChatSockets(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : undefined;
      const demoUser =
        socket.handshake.auth.demoUser && typeof socket.handshake.auth.demoUser === "object"
          ? (socket.handshake.auth.demoUser as Record<string, string>)
          : undefined;
      if (demoUser) {
        socket.handshake.headers["x-user-id"] = demoUser.id;
        socket.handshake.headers["x-user-name"] = demoUser.name;
        socket.handshake.headers["x-user-email"] = demoUser.email;
        socket.handshake.headers["x-user-image"] = demoUser.imageUrl;
      }
      (socket as AuthedSocket).user = await authFromSocket(socket.handshake.headers, token);
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Socket authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const authed = socket as AuthedSocket;
    await redis.sadd(`presence:${authed.user.id}:sockets`, socket.id);
    await setUserPresence(authed.user.id, "online");
    io.emit("presence:update", { userId: authed.user.id, status: "online" });

    socket.on("channel:join", async (channelId: string, ack?: (response: unknown) => void) => {
      try {
        await ensureMember(channelId, authed.user.id);
        await socket.join(channelId);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, message: error instanceof Error ? error.message : "Unable to join channel" });
      }
    });

    socket.on("typing:start", async ({ channelId }: { channelId: string }) => {
      await ensureMember(channelId, authed.user.id);
      socket.to(channelId).emit("typing:update", { channelId, user: authed.user, isTyping: true });
    });

    socket.on("typing:stop", async ({ channelId }: { channelId: string }) => {
      socket.to(channelId).emit("typing:update", { channelId, user: authed.user, isTyping: false });
    });

    socket.on("message:read", async ({ channelId, messageId }: { channelId: string; messageId: string }) => {
      await ensureMember(channelId, authed.user.id);
      await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: authed.user.id } });
      io.to(channelId).emit("message:read", { channelId, messageId, userId: authed.user.id });
    });

    socket.on("message:send", async (payload, ack?: (response: unknown) => void) => {
      try {
        if (!throttle(authed.user.id)) {
          throw new Error("You are sending messages too quickly");
        }

        const body = messageSchema.parse(payload);
        const message = await createMessage({
          channelId: body.channelId,
          sender: authed.user,
          body: body.body,
          attachments: body.attachments
        });
        const channel = await Channel.findById(body.channelId).lean();
        const event = { origin: instanceId, channelId: body.channelId, message };

        io.to(body.channelId).emit("message:new", event);
        await redisPub.publish(redisMessageTopic, JSON.stringify(event));

        if (channel) {
          await notificationQueue.add("message-created", {
            channelId: body.channelId,
            senderId: authed.user.id,
            senderName: authed.user.name,
            memberIds: channel.memberIds,
            body: body.body
          });
        }

        ack?.({ ok: true, message });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to send message";
        socket.emit("error", { message });
        ack?.({ ok: false, message });
      }
    });

    socket.on("disconnect", async () => {
      await redis.srem(`presence:${authed.user.id}:sockets`, socket.id);
      const count = await redis.scard(`presence:${authed.user.id}:sockets`);
      if (count === 0) {
        await setUserPresence(authed.user.id, "offline");
        io.emit("presence:update", { userId: authed.user.id, status: "offline" });
      }
    });
  });

  redisSub.subscribe(redisMessageTopic).catch((error) => logger.error({ error }, "redis subscribe failed"));
  redisSub.on("message", (_topic, raw) => {
    try {
      const event = JSON.parse(raw) as { origin: string; channelId: string; message: unknown };
      if (event.origin !== instanceId) {
        io.to(event.channelId).emit("message:new", event);
      }
    } catch (error) {
      logger.error({ error }, "failed to parse redis chat event");
    }
  });
}
