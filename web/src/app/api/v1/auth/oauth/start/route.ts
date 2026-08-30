import { apiError, apiJson } from "@/lib/apiResponse";
import { beginOAuth, providers, safeNativeRedirect } from "@/lib/nativeOAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { provider?: unknown; redirectUri?: unknown } | null;
  if (typeof body?.provider !== "string" || !providers.includes(body.provider as never) || typeof body.redirectUri !== "string" || !safeNativeRedirect(body.redirectUri)) return apiError(req, 400, "VALIDATION_FAILED", "Invalid OAuth request");
  try { return apiJson(req, { authorizationUrl: (await beginOAuth(body.provider as never, body.redirectUri, new URL(req.url).origin)).toString() }); }
  catch { return apiError(req, 503, "OAUTH_UNAVAILABLE", "OAuth provider is not configured"); }
}
