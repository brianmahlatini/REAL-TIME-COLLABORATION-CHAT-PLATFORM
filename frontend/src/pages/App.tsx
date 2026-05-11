import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Circle,
  Hash,
  Lock,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  Users
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useChatSocket } from "../hooks/useChatSocket";
import { absoluteFileUrl, api } from "../lib/api";
import type { ApiAuth, Attachment, Channel, Message, User } from "../lib/types";

type Props = {
  auth: ApiAuth;
  userMenu?: ReactNode;
};

export default function App({ auth, userMenu }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [channelName, setChannelName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<number | undefined>(undefined);

  const socket = useChatSocket(auth, activeChannelId);
  const activeChannel = channels.find((channel) => channel._id === activeChannelId);

  useEffect(() => {
    Promise.all([api.channels(auth), api.users(auth)])
      .then(([channelResponse, userResponse]) => {
        setChannels(channelResponse.channels);
        setUsers(userResponse.users);
        setActiveChannelId(channelResponse.channels[0]?._id);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load workspace"));
  }, [auth]);

  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }
    api
      .messages(auth, activeChannelId)
      .then((response) => setMessages(response.messages))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load messages"));
  }, [activeChannelId, auth]);

  useEffect(() => {
    if (!socket.incoming) return;
    if (socket.incoming.channelId === activeChannelId) {
      setMessages((current) =>
        current.some((message) => message._id === socket.incoming?._id) ? current : [...current, socket.incoming!]
      );
    }
    socket.setIncoming(null);
  }, [activeChannelId, socket]);

  const members = useMemo(() => {
    if (!activeChannel) return [];
    return users.filter((user) => activeChannel.memberIds.includes(user.externalId));
  }, [activeChannel, users]);

  const people = useMemo(() => users.filter((user) => user.externalId !== auth.profile.id), [auth.profile.id, users]);

  function channelLabel(channel?: Channel) {
    if (!channel) return "Create a channel";
    if (channel.type !== "dm") return channel.name;

    const otherMember = users.find((user) => channel.memberIds.includes(user.externalId) && user.externalId !== auth.profile.id);
    return otherMember?.name || "Direct message";
  }

  async function createChannel() {
    if (!channelName.trim()) return;
    const response = await api.createChannel(auth, { name: channelName.trim() });
    setChannels((current) => [response.channel, ...current]);
    setActiveChannelId(response.channel._id);
    setChannelName("");
  }

  async function createDm(user: User) {
    const response = await api.createDm(auth, user.externalId);
    setChannels((current) =>
      current.some((channel) => channel._id === response.channel._id) ? current : [response.channel, ...current]
    );
    setActiveChannelId(response.channel._id);
  }

  async function deleteActiveChannel() {
    if (!activeChannel) return;
    const confirmed = window.confirm(`Delete ${channelLabel(activeChannel)} and all messages in it?`);
    if (!confirmed) return;

    try {
      await api.deleteChannel(auth, activeChannel._id);
      setChannels((current) => {
        const next = current.filter((channel) => channel._id !== activeChannel._id);
        setActiveChannelId(next[0]?._id);
        return next;
      });
      setMessages([]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete chat");
    }
  }

  function sendMessage() {
    if (!activeChannelId || (!draft.trim() && attachments.length === 0)) return;
    socket.sendMessage(activeChannelId, draft.trim(), attachments);
    socket.stopTyping(activeChannelId);
    setDraft("");
    setAttachments([]);
  }

  async function uploadFile(file?: File) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const response = await api.upload(auth, file);
      setAttachments((current) => [...current, response.file]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function enableNotifications() {
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("Push notifications need VAPID keys and browser support.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setError("Notifications were not allowed by the browser.");
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    await api.saveNotificationSubscription(auth, subscription);
    setNotificationsEnabled(true);
    setError(null);
  }

  function handleTyping(value: string) {
    setDraft(value);
    if (!activeChannelId) return;
    socket.startTyping(activeChannelId);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => socket.stopTyping(activeChannelId), 900);
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">TC</div>
          <div>
            <strong>Team Chat</strong>
            <span>{socket.connected ? "Live workspace" : "Connecting..."}</span>
          </div>
        </div>

        <div className="current-user">
          <div className="avatar">{auth.profile.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <span>Signed in as</span>
            <strong>{auth.profile.name}</strong>
          </div>
        </div>

        <label className="search">
          <Search size={16} />
          <input placeholder="Search conversations" />
        </label>

        <section className="nav-section">
          <div className="section-title">
            <span>Channels</span>
            <button title="Create channel" onClick={createChannel}>
              <Plus size={16} />
            </button>
          </div>
          <div className="new-channel">
            <input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="new-channel" />
          </div>
          <div className="conversation-list">
            {channels
              .filter((channel) => channel.type !== "dm")
              .map((channel) => (
                <button
                  key={channel._id}
                  className={channel._id === activeChannelId ? "active" : ""}
                  onClick={() => setActiveChannelId(channel._id)}
                >
                  {channel.isPrivate ? <Lock size={16} /> : <Hash size={16} />}
                  <span>{channelLabel(channel)}</span>
                </button>
              ))}
          </div>
        </section>

        <section className="nav-section">
          <div className="section-title">
            <span>People</span>
            <Users size={16} />
          </div>
          <div className="conversation-list people">
            {people.length === 0 && <p className="empty-list">No teammates signed in yet.</p>}
            {people.map((user) => (
              <button key={user.externalId} onClick={() => createDm(user)}>
                <Circle
                  size={10}
                  className={(socket.presence[user.externalId] || user.status) === "online" ? "online" : "offline"}
                  fill="currentColor"
                />
                <span>{user.name}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <p>{activeChannel?.type === "dm" ? "Direct message" : "Channel"}</p>
            <h1>
              {activeChannel?.type === "dm" ? <MessageSquare size={22} /> : <Hash size={22} />}
              {channelLabel(activeChannel)}
            </h1>
          </div>
          <div className="header-actions">
            <button title="Delete selected chat" disabled={!activeChannel} onClick={deleteActiveChannel}>
              <Trash2 size={18} />
            </button>
            <button title="Enable notifications" className={notificationsEnabled ? "enabled" : ""} onClick={enableNotifications}>
              <Bell size={18} />
            </button>
            {userMenu || <div className="avatar">{auth.profile.name.slice(0, 1).toUpperCase()}</div>}
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        <div className="member-strip">
          {members.map((member) => (
            <span key={member.externalId}>
              <Circle
                size={9}
                className={(socket.presence[member.externalId] || member.status) === "online" ? "online" : "offline"}
                fill="currentColor"
              />
              {member.name}
            </span>
          ))}
        </div>

        <div className="messages">
          {messages.map((message) => (
            <article key={message._id} className={message.senderId === auth.profile.id ? "mine message" : "message"}>
              <div className="message-avatar">{message.senderName.slice(0, 1).toUpperCase()}</div>
              <div className="message-body">
                <div className="message-meta">
                  <strong>{message.senderName}</strong>
                  <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                </div>
                {message.body && <p>{message.body}</p>}
                {message.attachments.length > 0 && (
                  <div className="attachments">
                    {message.attachments.map((file) => (
                      <a key={file.url} href={absoluteFileUrl(file.url)} target="_blank" rel="noreferrer">
                        <Paperclip size={15} />
                        {file.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        <footer className="composer">
          {socket.typingUsers.length > 0 && (
            <div className="typing">{socket.typingUsers.map((user) => user.name).join(", ")} typing...</div>
          )}
          {attachments.length > 0 && (
            <div className="pending-files">
              {attachments.map((file) => (
                <span key={file.url}>
                  <Paperclip size={14} />
                  {file.name}
                </span>
              ))}
            </div>
          )}
          <div className="composer-row">
            <input ref={fileRef} type="file" hidden onChange={(event) => uploadFile(event.target.files?.[0])} />
            <button title="Upload file" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Upload size={18} />
            </button>
            <textarea
              value={draft}
              onChange={(event) => handleTyping(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={activeChannel ? `Message ${activeChannel.name}` : "Create or select a channel"}
            />
            <button className="send" title="Send message" onClick={sendMessage}>
              <Send size={18} />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
