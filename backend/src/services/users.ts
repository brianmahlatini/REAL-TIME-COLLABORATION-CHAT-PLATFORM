import { User } from "../models/User.js";
import type { AuthUser } from "../types.js";

export async function upsertUser(user: AuthUser) {
  return User.findOneAndUpdate(
    { externalId: user.id },
    {
      $set: {
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
        lastSeenAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
}

export async function setUserPresence(userId: string, status: "online" | "offline") {
  return User.findOneAndUpdate(
    { externalId: userId },
    { $set: { status, lastSeenAt: new Date() } },
    { new: true }
  );
}
