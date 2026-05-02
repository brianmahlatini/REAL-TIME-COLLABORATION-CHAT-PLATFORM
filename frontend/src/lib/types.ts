export type User = {
  _id?: string;
  externalId: string;
  email?: string;
  name: string;
  imageUrl?: string;
  status: "online" | "offline";
  lastSeenAt: string;
};

export type AuthProfile = {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string;
};

export type Channel = {
  _id: string;
  name: string;
  description?: string;
  type: "channel" | "group" | "dm";
  isPrivate: boolean;
  ownerId: string;
  memberIds: string[];
  lastMessageAt?: string;
  createdAt: string;
};

export type Attachment = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

export type Message = {
  _id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  body: string;
  attachments: Attachment[];
  readBy: string[];
  createdAt: string;
};

export type ApiAuth = {
  profile: AuthProfile;
  getToken: () => Promise<string | null>;
};
