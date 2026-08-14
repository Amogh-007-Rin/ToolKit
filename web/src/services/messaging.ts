export const MESSAGE_SERVICE_URL =
  process.env.NEXT_PUBLIC_MESSAGE_SERVICE_URL ?? "/message-service";

function messageSocketUrl(): string {
  if (/^https?:\/\//.test(MESSAGE_SERVICE_URL)) {
    return `${MESSAGE_SERVICE_URL.replace(/^http/, "ws")}/ws`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Next rewrites reliably proxy the REST calls, but a browser WebSocket
  // upgrade is not forwarded by every Next dev-server path. On LAN HTTP
  // development, connect to the message service on the same host directly.
  if (window.location.protocol === "http:" && window.location.port === "3000") {
    return `${protocol}//${window.location.hostname}:8080/ws`;
  }
  const base = MESSAGE_SERVICE_URL.startsWith("/") ? MESSAGE_SERVICE_URL : `/${MESSAGE_SERVICE_URL}`;
  return `${protocol}//${window.location.host}${base}/ws`;
}

export interface Contact {
  id: string;
  name: string | null;
  image: string | null;
  tag: string | null;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  attachments: Attachment[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface Attachment {
  key: string;
  kind: "image" | "video";
  name?: string | null;
}

export interface MessagePreview {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface Room {
  id: string;
  kind: string;
  name: string | null;
  createdBy: string;
  createdAt: string;
}

export interface RoomListItem extends Room {
  members: string[];
  lastMessage: MessagePreview | null;
  unreadCount: number;
  memberLastSeen: Record<string, string | null>;
}

export type ClientEvent =
  | { type: "heartbeat" }
  | { type: "joinRoom"; roomId: string }
  | { type: "leaveRoom"; roomId: string }
  | {
      type: "sendMessage";
      roomId: string;
      tempId?: string;
      content: string;
      attachments?: Attachment[];
    }
  | { type: "typingStart"; roomId: string }
  | { type: "typingStop"; roomId: string };

export type ServerEvent =
  | { type: "connect"; connectionId: string; userId: string }
  | { type: "joined"; roomId: string }
  | { type: "left"; roomId: string }
  | { type: "message"; message: Message }
  | {
      type: "messageAck";
      roomId: string;
      tempId: string | null;
      messageId: string;
      delivered: boolean;
      error: string | null;
    }
  | { type: "typingStart"; roomId: string; userId: string }
  | { type: "typingStop"; roomId: string; userId: string }
  | { type: "error"; code: string; message: string }
  | { type: "userOnline"; userId: string }
  | { type: "userOffline"; userId: string; lastSeenAt: string };

export type ConnStatus = "connecting" | "open" | "reconnecting" | "offline";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let cachedToken: { value: string; at: number } | null = null;

export async function getAuthToken(force = false): Promise<string> {
  if (!force && cachedToken && Date.now() - cachedToken.at < 5 * 60_000) {
    return cachedToken.value;
  }
  const res = await fetch("/api/messages/token", { cache: "no-store" });
  if (!res.ok) {
    throw new ApiError(res.status, "Unauthorized");
  }
  const { token } = (await res.json()) as { token: string };
  cachedToken = { value: token, at: Date.now() };
  return token;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${MESSAGE_SERVICE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      cachedToken = null;
    }
    throw new ApiError(res.status, text || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function listRooms(): Promise<{ rooms: RoomListItem[] }> {
  return api("/rooms");
}

export function createDirectRoom(
  userId: string,
): Promise<{ room: Room & { members: string[] } }> {
  return api("/rooms/direct", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function getMessages(
  roomId: string,
  before?: string | null,
  limit = 50,
): Promise<{ roomId: string; messages: Message[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) {
    params.set("before", before);
  }
  return api(`/rooms/${roomId}/messages?${params.toString()}`);
}

export function markRead(roomId: string): Promise<{ ok: boolean; roomId: string }> {
  return api(`/rooms/${roomId}/read`, { method: "POST" });
}

export class MessagingSocket {
  private ws: WebSocket | null = null;
  private status: ConnStatus = "offline";
  private reconnectDelayMs = 1000;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private epoch = 0;
  private statusListeners = new Set<(status: ConnStatus) => void>();
  private eventListeners = new Set<(event: ServerEvent) => void>();
  private queue: ClientEvent[] = [];

  get isOpen(): boolean {
    return this.status === "open";
  }

  private setStatus(status: ConnStatus) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  async connect(): Promise<void> {
    const epoch = ++this.epoch;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.setStatus("connecting");
    try {
      const token = await getAuthToken();
      if (epoch !== this.epoch) {
        return;
      }
      const url = `${messageSocketUrl()}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => {
        if (epoch !== this.epoch) {
          ws.close();
          return;
        }
        this.setStatus("open");
        this.reconnectDelayMs = 1000;
        this.startHeartbeat();
        this.flushQueue();
      };
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as ServerEvent;
          this.eventListeners.forEach((listener) => listener(parsed));
        } catch {
          // ignore malformed frames
        }
      };
      ws.onerror = () => {
        ws.close();
      };
      ws.onclose = () => {
        if (epoch !== this.epoch) {
          return;
        }
        this.stopHeartbeat();
        this.ws = null;
        this.scheduleReconnect();
      };
    } catch {
      if (epoch !== this.epoch) {
        return;
      }
      this.setStatus("offline");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null) {
      return;
    }
    this.setStatus("reconnecting");
    const delay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 15_000);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "heartbeat" } satisfies ClientEvent));
      }
    }, 15_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(event: ClientEvent) {
    if (this.isOpen && this.ws) {
      this.ws.send(JSON.stringify(event));
    } else {
      this.queue.push(event);
    }
  }

  private flushQueue() {
    const pending = this.queue.splice(0);
    pending.forEach((event) => {
      this.ws?.send(JSON.stringify(event));
    });
  }

  onEvent(listener: (event: ServerEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onStatus(listener: (status: ConnStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  disconnect() {
    this.epoch++;
    this.ws?.close();
    this.ws = null;
    this.queue = [];
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.setStatus("offline");
  }
}

export const messagingSocket = new MessagingSocket();
