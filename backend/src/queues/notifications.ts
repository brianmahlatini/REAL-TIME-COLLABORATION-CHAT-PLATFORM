import { Queue, Worker } from "bullmq";
import nodemailer from "nodemailer";
import webpush from "web-push";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { redis } from "../database/redis.js";
import { NotificationSubscription } from "../models/NotificationSubscription.js";

type NotificationJob = {
  channelId: string;
  senderId: string;
  senderName: string;
  memberIds: string[];
  body: string;
};

export const notificationQueue = new Queue<NotificationJob>("notifications", {
  connection: redis
});

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

const mailer =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      })
    : undefined;

export function startNotificationWorker() {
  const worker = new Worker<NotificationJob>(
    "notifications",
    async (job) => {
      const recipients = job.data.memberIds.filter((id) => id !== job.data.senderId);

      if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
        const subscriptions = await NotificationSubscription.find({ userId: { $in: recipients } }).lean();
        await Promise.allSettled(
          subscriptions.map((subscription) =>
            webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: subscription.keys
              },
              JSON.stringify({
                title: `${job.data.senderName} sent a message`,
                body: job.data.body || "New file shared",
                channelId: job.data.channelId
              })
            )
          )
        );
      }

      if (mailer) {
        logger.info({ jobId: job.id }, "email notifications are configured; add recipient email lookup here");
      }
    },
    { connection: redis }
  );

  worker.on("failed", (job, error) => logger.error({ jobId: job?.id, error }, "notification job failed"));
  return worker;
}
