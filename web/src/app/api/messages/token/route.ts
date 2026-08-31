import { NextRequest, NextResponse } from "next/server";
import { createRealtimeTicket } from "@/lib/mobileAuth";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ token: await createRealtimeTicket(userId), expiresIn: 60 });
}
