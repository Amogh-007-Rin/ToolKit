import prisma from "@/db";
import { issueAccountToken } from "@/lib/accountTokens";
import { apiJson } from "@/lib/apiResponse";
import { publicAppUrl, sendAccountEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: unknown } | null;
  if (typeof body?.email === "string") {
    const user = await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } });
    if (user?.password && !user.hiddenAt) {
      const token = await issueAccountToken(user.id, "password_reset", 60 * 60_000);
      await sendAccountEmail(user.email, "Reset your ToolKit password", publicAppUrl("/reset-password", token), "Reset password");
    }
  }
  return apiJson(req, { accepted: true });
}
