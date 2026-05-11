import type { ApiAuth, Attachment, Channel, Message, User } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function authHeaders(auth: ApiAuth) {
  const token = await auth.getToken();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-user-id": auth.profile.id,
    "x-user-name": auth.profile.name
  };

  if (auth.profile.email) headers["x-user-email"] = auth.profile.email;
  if (auth.profile.imageUrl) headers["x-user-image"] = auth.profile.imageUrl;
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

async function request<T>(auth: ApiAuth, path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders(auth);
  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  async me(auth: ApiAuth) {
    return request<{ user: unknown }>(auth, "/me");
  },
  async users(auth: ApiAuth) {
    return request<{ users: User[] }>(auth, "/users");
  },
  async channels(auth: ApiAuth) {
    return request<{ channels: Channel[] }>(auth, "/channels");
  },
  async createChannel(auth: ApiAuth, input: { name: string; description?: string; isPrivate?: boolean }) {
    return request<{ channel: Channel }>(auth, "/channels", {
      method: "POST",
      body: JSON.stringify({ ...input, type: "channel", memberIds: [] })
    });
  },
  async createDm(auth: ApiAuth, memberId: string) {
    return request<{ channel: Channel }>(auth, "/direct-messages", {
      method: "POST",
      body: JSON.stringify({ memberId })
    });
  },
  async messages(auth: ApiAuth, channelId: string) {
    return request<{ messages: Message[] }>(auth, `/channels/${channelId}/messages`);
  },
  async deleteChannel(auth: ApiAuth, channelId: string) {
    await request<void>(auth, `/channels/${channelId}`, {
      method: "DELETE"
    });
  },
  async upload(auth: ApiAuth, file: File) {
    const token = await auth.getToken();
    const form = new FormData();
    form.append("file", file);

    const headers: Record<string, string> = {
      "x-user-id": auth.profile.id,
      "x-user-name": auth.profile.name
    };
    if (token) headers.authorization = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/api/uploads`, {
      method: "POST",
      headers,
      body: form
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || "Upload failed");
    }

    return response.json() as Promise<{ file: Attachment }>;
  },
  async saveNotificationSubscription(auth: ApiAuth, subscription: PushSubscription) {
    return request<{ subscription: unknown }>(auth, "/notifications/subscriptions", {
      method: "POST",
      body: JSON.stringify(subscription.toJSON())
    });
  }
};

export function absoluteFileUrl(url: string) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}
