import prisma from "@/db";
import { issueAccountToken } from "@/lib/accountTokens";
import { apiJson } from "@/lib/apiResponse";
import { publicAppUrl, sendAccountEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: unknown } | null;
  if (typeof body?.email === "string") {
    const user = await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } });
    if (user?.emailVerificationRequired && !user.emailVerified) {
      const token = await issueAccountToken(user.id, "email_verification", 24 * 60 * 60_000);
      await sendAccountEmail(user.email, "Verify your ToolKit account", publicAppUrl("/verify-email", token), "Verify email");
    }
  }
  return apiJson(req, { accepted: true });
}
