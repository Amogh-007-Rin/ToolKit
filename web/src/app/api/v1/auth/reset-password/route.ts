import prisma from "@/db";
import { consumeAccountToken } from "@/lib/accountTokens";
import { apiError, apiJson } from "@/lib/apiResponse";
import { revokeAllNativeSessions } from "@/lib/mobileAuth";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const schema = z.object({ token: z.string(), password: z.string().min(8).max(128) });
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(req, 400, "VALIDATION_FAILED", "Invalid password reset");
  const userId = await consumeAccountToken(parsed.data.token, "password_reset");
  if (!userId) return apiError(req, 400, "TOKEN_INVALID", "Reset link is invalid or expired");
  await prisma.$transaction([prisma.user.update({ where: { id: userId }, data: { password: await hashPassword(parsed.data.password) } }), prisma.session.deleteMany({ where: { userId } })]);
  await revokeAllNativeSessions(userId);
  return apiJson(req, { reset: true });
}
