import createClient from "openapi-fetch";
import type { paths } from "@/generated/api-schema";
import { config } from "@/lib/config";
import { clientId } from "@/lib/ids";
import { ApiError } from "@/lib/query";
import { useSessionStore } from "@/store/session";

export const contractClient = createClient<paths>({ baseUrl: config.apiUrl });

contractClient.use({
  async onRequest({ request }) {
    const token = useSessionStore.getState().accessToken;
    request.headers.set("Accept", "application/json");
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    if (!request.headers.has("X-Request-ID")) request.headers.set("X-Request-ID", clientId("req"));
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !request.headers.has("Idempotency-Key")) {
      request.headers.set("Idempotency-Key", clientId("mutation"));
    }
    return request;
  },
  async onResponse({ request, response }) {
    if (response.status !== 401 || !useSessionStore.getState().accessToken) return response;
    if (!await useSessionStore.getState().refreshAccess()) return response;
    const token = useSessionStore.getState().accessToken;
    const retry = new Request(request);
    if (token) retry.headers.set("Authorization", `Bearer ${token}`);
    return fetch(retry);
  },
});

interface ContractError {
  code?: string;
  message?: string;
  error?: string;
}

export function contractData<T>(result: { data?: unknown; error?: unknown; response: Response }): T {
  if (result.data !== undefined) return result.data as T;
  const body = (result.error ?? {}) as ContractError;
  throw new ApiError(result.response.status, body.code ?? "REQUEST_FAILED", body.message ?? body.error ?? "Request failed");
}
