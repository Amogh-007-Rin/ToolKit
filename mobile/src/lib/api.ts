import { config } from "@/lib/config";
import { ApiError } from "@/lib/query";
import { useSessionStore } from "@/store/session";
import { clientId } from "@/lib/ids";
import { discardMutation, enqueueMutation } from "@/lib/offlineQueue";

interface ErrorBody {
  code?: string;
  message?: string;
  error?: string;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, true);
}

export async function queueableApi<T>(operation: string, path: string, init: RequestInit): Promise<T> {
  const method = init.method?.toUpperCase() ?? "POST";
  const body = typeof init.body === "string" ? init.body : null;
  const queueId = await enqueueMutation({ operation, path, method, body });
  try {
    const result = await api<T>(path, {
      ...init,
      headers: { ...Object.fromEntries(new Headers(init.headers).entries()), "Idempotency-Key": queueId },
    });
    await discardMutation(queueId);
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      await discardMutation(queueId);
      throw error;
    }
    throw new ApiError(202, "OFFLINE_QUEUED", "Saved offline and queued for delivery");
  }
}

async function request<T>(path: string, init: RequestInit, allowRefresh: boolean): Promise<T> {
  const accessToken = useSessionStore.getState().accessToken;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("X-Request-ID")) headers.set("X-Request-ID", clientId("req"));
  if (init.method && !["GET", "HEAD", "OPTIONS"].includes(init.method.toUpperCase()) && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", clientId("mutation"));
  }
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${config.apiUrl}${path}`, { ...init, headers });
  if (response.status === 401 && accessToken && allowRefresh) {
    const refreshed = await useSessionStore.getState().refreshAccess();
    if (refreshed) return request<T>(path, init, false);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(
      response.status,
      body.code ?? "REQUEST_FAILED",
      body.message ?? body.error ?? "Request failed",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
