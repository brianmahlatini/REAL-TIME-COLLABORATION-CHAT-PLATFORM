import mongoose, { Schema, Types } from "mongoose";
import type { Attachment } from "../types.js";

export type MessageDocument = {
  channelId: Types.ObjectId;
  senderId: string;
  senderName: string;
  body: string;
  attachments: Attachment[];
  readBy: string[];
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const attachmentSchema = new Schema<Attachment>(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }
  },
  { _id: false }
);

const messageSchema = new Schema<MessageDocument>(
  {
    channelId: { type: Schema.Types.ObjectId, ref: "Channel", required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    body: { type: String, default: "", maxlength: 8000 },
    attachments: { type: [attachmentSchema], default: [] },
    readBy: { type: [String], default: [] },
    editedAt: Date,
    deletedAt: Date
  },
  { timestamps: true }
);

messageSchema.index({ channelId: 1, createdAt: -1 });

export const Message = mongoose.model<MessageDocument>("Message", messageSchema);
