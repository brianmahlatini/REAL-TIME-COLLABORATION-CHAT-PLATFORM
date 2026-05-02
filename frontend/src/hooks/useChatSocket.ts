import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ApiAuth, Attachment, Message, User } from "../lib/types";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:4000";

export function useChatSocket(auth: ApiAuth, activeChannelId?: string) {
  const [connected, setConnected] = useState(false);
  const [incoming, setIncoming] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, User>>({});
  const [presence, setPresence] = useState<Record<string, "online" | "offline">>({});
  const socketRef = useRef<Socket | null>(null);

  const demoUser = useMemo(
    () => ({
      id: auth.profile.id,
      name: auth.profile.name,
      email: auth.profile.email,
      imageUrl: auth.profile.imageUrl
    }),
    [auth.profile.email, auth.profile.id, auth.profile.imageUrl, auth.profile.name]
  );

  useEffect(() => {
    let socket: Socket;
    let cancelled = false;

    auth.getToken().then((token) => {
      if (cancelled) return;
      socket = io(WS_URL, {
        auth: {
          token,
          demoUser
        }
      });
      socketRef.current = socket;

      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socket.on("message:new", (event: { message: Message }) => setIncoming(event.message));
      socket.on("typing:update", (event: { channelId: string; user: User; isTyping: boolean }) => {
        setTypingUsers((current) => {
          if (event.channelId !== activeChannelId) return current;
          const next = { ...current };
          if (event.isTyping) next[event.user.externalId || event.user._id || event.user.name] = event.user;
          else delete next[event.user.externalId || event.user._id || event.user.name];
          return next;
        });
      });
      socket.on("presence:update", (event: { userId: string; status: "online" | "offline" }) => {
        setPresence((current) => ({ ...current, [event.userId]: event.status }));
      });
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [activeChannelId, auth, demoUser]);

  useEffect(() => {
    if (!activeChannelId || !socketRef.current) return;
    socketRef.current.emit("channel:join", activeChannelId);
    setTypingUsers({});
  }, [activeChannelId, connected]);

  return {
    connected,
    incoming,
    setIncoming,
    typingUsers: Object.values(typingUsers),
    presence,
    sendMessage(channelId: string, body: string, attachments: Attachment[]) {
      socketRef.current?.emit("message:send", { channelId, body, attachments });
    },
    startTyping(channelId: string) {
      socketRef.current?.emit("typing:start", { channelId });
    },
    stopTyping(channelId: string) {
      socketRef.current?.emit("typing:stop", { channelId });
    }
  };
}
