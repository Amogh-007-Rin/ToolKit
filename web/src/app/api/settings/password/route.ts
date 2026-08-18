import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { FixedWindowRateLimiter } from "@/lib/rateLimit";

const limiter = new FixedWindowRateLimiter(5, 15 * 60_000);

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!limiter.allow(userId)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
    return NextResponse.json({ error: "Both password fields are required" }, { status: 400 });
  }
  if (body.newPassword.length < 8 || body.newPassword.length > 128) {
    return NextResponse.json({ error: "New password must be between 8 and 128 characters" }, { status: 400 });
  }
  if (body.currentPassword === body.newPassword) {
    return NextResponse.json({ error: "Choose a password you have not already used" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user?.password || !(await verifyPassword(body.currentPassword, user.password))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(body.newPassword) },
  });
  limiter.reset(userId);
  return NextResponse.json({ updated: true });
}
