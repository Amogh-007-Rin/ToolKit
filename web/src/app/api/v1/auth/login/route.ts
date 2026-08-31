import { NextResponse } from "next/server";
import prisma from "@/db";
import { verifyPassword } from "@/lib/password";
import { FixedWindowRateLimiter, requestClientKey } from "@/lib/rateLimit";
import { createNativeSession } from "@/lib/mobileAuth";
import { credentialsSchema } from "@/types/validation";

const limiter = new FixedWindowRateLimiter(10, 15 * 60_000);

export async function POST(req: Request) {
  const clientKey = requestClientKey(req);
  if (!limiter.allow(clientKey)) {
    return NextResponse.json({ code: "RATE_LIMITED", message: "Too many attempts" }, { status: 429 });
  }
  const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "VALIDATION_FAILED", message: "Invalid email or password" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.password || !(await verifyPassword(parsed.data.password, user.password))) {
    return NextResponse.json({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" }, { status: 401 });
  }
  if (user.hiddenAt) return NextResponse.json({ code: "ACCOUNT_PENDING_DELETION", message: "Restore this account before signing in" }, { status: 403 });
  if (user.suspendedAt) {
    const session = await createNativeSession(
      { id: user.id, email: user.email, name: user.name, image: user.image, tag: user.tag },
      { deviceName: req.headers.get("x-device-name") ?? undefined, userAgent: req.headers.get("user-agent") ?? undefined },
    );
    return NextResponse.json({ ...session, restricted: true, restriction: "ACCOUNT_SUSPENDED", suspensionReason: user.suspensionReason }, { headers: { "Cache-Control": "no-store" } });
  }
  if (user.emailVerificationRequired && !user.emailVerified) return NextResponse.json({ code: "EMAIL_NOT_VERIFIED", message: "Verify your email before signing in" }, { status: 403 });
  limiter.reset(clientKey);
  const session = await createNativeSession(
    { id: user.id, email: user.email, name: user.name, image: user.image, tag: user.tag },
    { deviceName: req.headers.get("x-device-name") ?? undefined, userAgent: req.headers.get("user-agent") ?? undefined },
  );
  return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
}
