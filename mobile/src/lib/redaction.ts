const SENSITIVE_KEY = /token|password|secret|authorization|cookie|message|content|media|url|email|phone|location|bio|name/i;
const URL_OR_TOKEN = /(https?:\/\/\S+|(?:bearer\s+)?[A-Za-z0-9_-]{24,}\.?[A-Za-z0-9_-]*)/gi;

export function redactTelemetry(value: unknown): unknown {
  if (typeof value === "string") return value.replace(URL_OR_TOKEN, "[REDACTED]").slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 20).map(redactTelemetry);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactTelemetry(item)]));
  return value;
}
