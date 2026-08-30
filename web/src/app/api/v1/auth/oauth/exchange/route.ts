import prisma from "@/db";
import { consumeAccountToken } from "@/lib/accountTokens";
import { apiError, apiJson } from "@/lib/apiResponse";
import { createNativeSession } from "@/lib/mobileAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { code?: unknown } | null;
  if (typeof body?.code !== "string") return apiError(req, 400, "VALIDATION_FAILED", "OAuth exchange code required");
  const userId = await consumeAccountToken(body.code, "mobile_oauth");
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "OAuth exchange code is invalid or expired");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, image: true, tag: true, hiddenAt: true } });
  if (!user || user.hiddenAt) return apiError(req, 403, "ACCOUNT_UNAVAILABLE", "Account is unavailable");
  return apiJson(req, await createNativeSession(user, { deviceName: req.headers.get("x-device-name") ?? undefined, userAgent: req.headers.get("user-agent") ?? undefined }));
}
