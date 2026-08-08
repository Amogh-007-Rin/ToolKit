import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const MESSAGE_SERVICE =
  process.env.NEXT_PUBLIC_MESSAGE_SERVICE_URL ?? "http://127.0.0.1:8080";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${MESSAGE_SERVICE}/messages/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return NextResponse.json({ count: 0 });
    }
    const data = (await res.json()) as {
      rooms?: { unreadCount?: number }[];
    };
    const count = (data.rooms ?? []).reduce(
      (sum, room) => sum + (room.unreadCount ?? 0),
      0,
    );
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
