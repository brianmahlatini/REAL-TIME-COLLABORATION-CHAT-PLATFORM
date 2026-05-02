import mongoose, { Schema } from "mongoose";

export type NotificationSubscriptionDocument = {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const notificationSubscriptionSchema = new Schema<NotificationSubscriptionDocument>(
  {
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    }
  },
  { timestamps: true }
);

export const NotificationSubscription = mongoose.model<NotificationSubscriptionDocument>(
  "NotificationSubscription",
  notificationSubscriptionSchema
);
