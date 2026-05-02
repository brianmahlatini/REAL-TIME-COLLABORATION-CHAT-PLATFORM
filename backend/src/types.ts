import type { Request } from "express";

export type AuthUser = {
  id: string;
  email?: string;
  name: string;
  imageUrl?: string;
};

export type AuthedRequest = Request & {
  user: AuthUser;
};

export type Attachment = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
};
