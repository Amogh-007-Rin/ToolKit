import { NextResponse } from "next/server";
import { revokeNativeSession } from "@/lib/mobileAuth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { refreshToken?: unknown } | null;
  if (typeof body?.refreshToken === "string" && body.refreshToken.length <= 500) {
    await revokeNativeSession(body.refreshToken);
  }
  return new NextResponse(null, { status: 204 });
}
