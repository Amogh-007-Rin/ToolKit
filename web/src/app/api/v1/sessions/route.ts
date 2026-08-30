import { apiError, apiJson } from "@/lib/apiResponse";
import { listNativeSessions, revokeAllNativeSessions } from "@/lib/mobileAuth";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  return apiJson(req, { sessions: await listNativeSessions(userId) });
}

export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  return apiJson(req, { revoked: await revokeAllNativeSessions(userId) });
}
