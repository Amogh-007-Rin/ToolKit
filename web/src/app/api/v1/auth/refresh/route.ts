import { NextResponse } from "next/server";
import { rotateNativeSession } from "@/lib/mobileAuth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { refreshToken?: unknown } | null;
  if (typeof body?.refreshToken !== "string" || body.refreshToken.length > 500) {
    return NextResponse.json({ code: "VALIDATION_FAILED", message: "Invalid refresh token" }, { status: 400 });
  }
  const session = await rotateNativeSession(body.refreshToken);
  if (!session) {
    return NextResponse.json({ code: "AUTH_EXPIRED", message: "Session expired" }, { status: 401 });
  }
  return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
}
