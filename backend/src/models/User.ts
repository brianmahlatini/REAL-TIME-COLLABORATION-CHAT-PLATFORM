import mongoose, { Schema } from "mongoose";

export type UserDocument = {
  externalId: string;
  email?: string;
  name: string;
  imageUrl?: string;
  status: "online" | "offline";
  lastSeenAt: Date;
};

const userSchema = new Schema<UserDocument>(
  {
    externalId: { type: String, required: true, unique: true, index: true },
    email: { type: String, index: true },
    name: { type: String, required: true },
    imageUrl: String,
    status: { type: String, enum: ["online", "offline"], default: "offline" },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDocument>("User", userSchema);
