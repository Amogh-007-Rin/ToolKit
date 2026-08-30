import { apiError, apiJson } from "@/lib/apiResponse";
import { createRealtimeTicket } from "@/lib/mobileAuth";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  return apiJson(req, { ticket: await createRealtimeTicket(userId), expiresIn: 60 });
}
