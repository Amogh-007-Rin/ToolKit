import { config } from "@/lib/config";
import { useSessionStore } from "@/store/session";

async function request<T>(path: string, init: RequestInit) { const response = await fetch(`${config.apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${useSessionStore.getState().accessToken}`, "Content-Type": "application/json" } }); if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string }; throw new Error(body.message ?? "Safety request failed"); } return response.json() as Promise<T>; }
export function blockUser(userId: string) { return request("/blocks", { method: "POST", body: JSON.stringify({ userId }) }); }
export function unblockUser(userId: string) { return request(`/blocks?userId=${encodeURIComponent(userId)}`, { method: "DELETE" }); }
export function reportContent(targetType: "profile" | "post" | "comment" | "message", targetId: string, reason: string, description?: string, messageEvidence?: object) { return request<{ report: { id: string } }>("/reports", { method: "POST", body: JSON.stringify({ targetType, targetId, reason, description, messageEvidence }) }); }
