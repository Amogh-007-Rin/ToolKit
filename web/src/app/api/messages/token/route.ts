import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // REST accepts the existing NextAuth JWE; realtime tickets are only for WS upgrades.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, raw: true });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
