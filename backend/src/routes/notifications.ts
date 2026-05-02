import { Router } from "express";
import { z } from "zod";
import { NotificationSubscription } from "../models/NotificationSubscription.js";
import type { AuthedRequest } from "../types.js";

export const notificationsRouter = Router();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

notificationsRouter.post("/notifications/subscriptions", async (req, res) => {
  const body = subscriptionSchema.parse(req.body);
  const user = (req as AuthedRequest).user;

  const subscription = await NotificationSubscription.findOneAndUpdate(
    { endpoint: body.endpoint },
    { $set: { ...body, userId: user.id } },
    { upsert: true, new: true }
  );

  res.status(201).json({ subscription });
});
