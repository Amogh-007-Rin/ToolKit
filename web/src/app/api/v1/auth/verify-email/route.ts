import prisma from "@/db";
import { consumeAccountToken } from "@/lib/accountTokens";
import { apiError, apiJson } from "@/lib/apiResponse";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { token?: unknown } | null;
  if (typeof body?.token !== "string") return apiError(req, 400, "VALIDATION_FAILED", "Verification token required");
  const userId = await consumeAccountToken(body.token, "email_verification");
  if (!userId) return apiError(req, 400, "TOKEN_INVALID", "Verification link is invalid or expired");
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date(), emailVerificationRequired: false } });
  return apiJson(req, { verified: true });
}
