import mongoose, { Schema, Types } from "mongoose";

export type ChannelDocument = {
  name: string;
  description?: string;
  type: "channel" | "group" | "dm";
  isPrivate: boolean;
  ownerId: string;
  memberIds: string[];
  lastMessageAt?: Date;
};

const channelSchema = new Schema<ChannelDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    type: { type: String, enum: ["channel", "group", "dm"], default: "channel", index: true },
    isPrivate: { type: Boolean, default: false },
    ownerId: { type: String, required: true, index: true },
    memberIds: [{ type: String, required: true, index: true }],
    lastMessageAt: Date
  },
  { timestamps: true }
);

channelSchema.index({ type: 1, memberIds: 1 });

export const Channel = mongoose.model<ChannelDocument>("Channel", channelSchema);
export const toObjectId = (id: string) => new Types.ObjectId(id);
