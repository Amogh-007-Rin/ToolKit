import { config } from "@/lib/config";
import { usePreferences } from "@/store/preferences";
import { redactTelemetry } from "@/lib/redaction";
export { redactTelemetry } from "@/lib/redaction";

export async function captureProductEvent(event: string, properties: Record<string, unknown> = {}) {
  if (!usePreferences.getState().analyticsEnabled || !config.posthogHost || !config.posthogKey) return;
  const userId = usePreferences.getState().analyticsId;
  const safeProperties = redactTelemetry(properties) as Record<string, unknown>;
  await fetch(`${config.posthogHost.replace(/\/$/, "")}/capture/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: config.posthogKey, event: event.slice(0, 100), properties: { distinct_id: userId, ...safeProperties, $lib: "toolkit-mobile" }, timestamp: new Date().toISOString() }) }).catch(() => undefined);
}

export async function captureOperationalError(error: unknown, context: Record<string, unknown> = {}) {
  if (!config.glitchtipDsn) return;
  try {
    const dsn = new URL(config.glitchtipDsn); const projectId = dsn.pathname.split("/").filter(Boolean).pop();
    if (!projectId) return;
    const endpoint = `${dsn.protocol}//${dsn.host}/api/${projectId}/store/?sentry_key=${encodeURIComponent(dsn.username)}&sentry_version=7`;
    const cause = error instanceof Error ? error : new Error("Operational error");
    await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_id: crypto.randomUUID().replace(/-/g, ""), timestamp: new Date().toISOString(), platform: "javascript", level: "error", logger: "toolkit-mobile", exception: { values: [{ type: cause.name, value: redactTelemetry(cause.message) }] }, extra: redactTelemetry(context) }) }).catch(() => undefined);
  } catch {}
}
