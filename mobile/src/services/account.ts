import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, queueableApi } from "@/lib/api";
import { config } from "@/lib/config";
import { useSessionStore } from "@/store/session";

async function v1<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${useSessionStore.getState().accessToken}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) } });
  if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string }; throw new Error(body.message ?? "Account request failed"); }
  return response.json() as Promise<T>;
}
export interface PrivacyPreferences { discoverable: boolean; showPosts: boolean; showCollections: boolean }
export function getPrivacy() { return api<{ preferences: PrivacyPreferences }>("/settings/privacy"); }
export function updatePrivacy(value: Partial<PrivacyPreferences>) { return queueableApi<{ preferences: PrivacyPreferences }>("preferences.privacy", "/settings/privacy", { method: "PATCH", body: JSON.stringify(value) }); }
export function recordConsent(document: "terms" | "privacy" | "analytics_opt_in" | "analytics_opt_out", version: string) { return queueableApi<{ consent: { document: string; version: string; acceptedAt: string } }>("consent.record", "/settings/consents", { method: "POST", body: JSON.stringify({ document, version }) }); }
export function changePassword(currentPassword: string, newPassword: string) { return api<{ updated: true }>("/settings/password", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) }); }
export function getSessions() { return v1<{ sessions: Array<{ id: string; deviceName: string | null; lastUsedAt: string; expiresAt: string }> }>("/sessions"); }
export function logoutAll() { return v1<{ revoked: number }>("/sessions", { method: "DELETE" }); }
export function scheduleDeletion() { return v1<{ deletionScheduledAt: string }>("/account/deletion", { method: "POST" }); }
export async function shareDataExport() {
  const response = await fetch(`${config.apiUrl}/settings/export`, { headers: { Authorization: `Bearer ${useSessionStore.getState().accessToken}` } });
  if (!response.ok) throw new Error("Could not export account data");
  const file = new File(Paths.cache, `toolkit-data-${new Date().toISOString().slice(0, 10)}.json`);
  file.write(await response.text());
  if (!await Sharing.isAvailableAsync()) throw new Error("Sharing is not available on this device");
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Export ToolKit data" });
}
