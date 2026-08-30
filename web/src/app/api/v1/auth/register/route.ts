import { NextResponse } from "next/server";
import prisma from "@/db";
import { Prisma } from "../../../../../../generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { issueAccountToken } from "@/lib/accountTokens";
import { publicAppUrl, sendAccountEmail } from "@/lib/mailer";
import { FixedWindowRateLimiter, requestClientKey } from "@/lib/rateLimit";
import { registerSchema } from "@/types/validation";

const limiter = new FixedWindowRateLimiter(5, 60_000);

export async function POST(req: Request) {
  const clientKey = requestClientKey(req);
  if (!limiter.allow(clientKey)) {
    return NextResponse.json({ code: "RATE_LIMITED", message: "Too many registration attempts" }, { status: 429 });
  }
  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "VALIDATION_FAILED", message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const user = await prisma.user.create({
      data: { email: parsed.data.email, name: parsed.data.name ?? null, password: await hashPassword(parsed.data.password), emailVerificationRequired: true },
    });
    const token = await issueAccountToken(user.id, "email_verification", 24 * 60 * 60_000);
    await sendAccountEmail(user.email, "Verify your ToolKit account", publicAppUrl("/verify-email", token), "Verify email");
    return NextResponse.json({ verificationRequired: true, email: user.email }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ code: "EMAIL_EXISTS", message: "An account with this email already exists" }, { status: 409 });
    }
    throw error;
  }
}
