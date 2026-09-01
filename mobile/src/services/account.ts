import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, queueableApi } from "@/lib/api";
import { config } from "@/lib/config";
import { useSessionStore } from "@/store/session";
import type { OperationResult } from "@/generated/contract-types";

export interface PrivacyPreferences { discoverable: boolean; showPosts: boolean; showCollections: boolean }
export function getPrivacy() { return api<OperationResult<"getPrivacyPreferences", { preferences: PrivacyPreferences }>>("/settings/privacy"); }
export function updatePrivacy(value: Partial<PrivacyPreferences>) { return queueableApi<OperationResult<"updatePrivacyPreferences", { preferences: PrivacyPreferences }>>("preferences.privacy", "/settings/privacy", { method: "PATCH", body: JSON.stringify(value) }); }
export function recordConsent(document: "terms" | "privacy" | "analytics_opt_in" | "analytics_opt_out", version: string) { return queueableApi<OperationResult<"recordConsent", { consent: { document: string; version: string; acceptedAt: string } }>>("consent.record", "/settings/consents", { method: "POST", body: JSON.stringify({ document, version }) }); }
export function changePassword(currentPassword: string, newPassword: string) { return api<OperationResult<"changePassword", { updated: true }>>("/settings/password", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) }); }
export function getSessions() { return api<OperationResult<"listSessions", { sessions: Array<{ id: string; deviceName: string | null; lastUsedAt: string; expiresAt: string }> }>>("/sessions"); }
export function logoutAll() { return api<OperationResult<"revokeAllSessions", { revoked: number }>>("/sessions", { method: "DELETE" }); }
export function scheduleDeletion() { return api<OperationResult<"scheduleAccountDeletion", { deletionScheduledAt: string }>>("/account/deletion", { method: "POST" }); }
export async function shareDataExport() {
  const response = await fetch(`${config.apiUrl}/settings/export`, { headers: { Authorization: `Bearer ${useSessionStore.getState().accessToken}` } });
  if (!response.ok) throw new Error("Could not export account data");
  const file = new File(Paths.cache, `toolkit-data-${new Date().toISOString().slice(0, 10)}.json`);
  file.write(await response.text());
  if (!await Sharing.isAvailableAsync()) throw new Error("Sharing is not available on this device");
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Export ToolKit data" });
}
