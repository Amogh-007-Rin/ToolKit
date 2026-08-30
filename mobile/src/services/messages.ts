import { config } from "@/lib/config";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";

export interface MessageItem { id: string; roomId: string; senderId: string; content: string; attachments: Array<{ key: string; kind: string; name?: string }>; createdAt: string; pending?: boolean; failed?: boolean }
export interface RoomItem { id: string; kind: string; name: string | null; members: string[]; unreadCount: number; lastMessage: { content: string; createdAt: string } | null }

async function messageRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useSessionStore.getState().accessToken;
  const response = await fetch(`${config.messageServiceUrl}${path}`, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) } });
  if (!response.ok) throw new Error(response.status === 401 ? "Session expired" : "Messaging request failed");
  return response.json() as Promise<T>;
}
export function getRooms() { return messageRequest<{ rooms: RoomItem[] }>("/rooms"); }
export function getMessages(roomId: string, before?: string) { return messageRequest<{ messages: MessageItem[] }>(`/rooms/${roomId}/messages?limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`); }
export function markRoomRead(roomId: string) { return messageRequest(`/rooms/${roomId}/read`, { method: "POST" }); }
export function createDirectRoom(userId: string) { return messageRequest<{ room: RoomItem }>("/rooms/direct", { method: "POST", body: JSON.stringify({ userId }) }); }
export async function realtimeUrl() {
  const token = useSessionStore.getState().accessToken;
  const response = await fetch(`${config.apiUrl}/realtime/ticket`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Could not connect to realtime messaging");
  const { ticket } = await response.json() as { ticket: string };
  return `${config.messageServiceUrl.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(ticket)}`;
}
