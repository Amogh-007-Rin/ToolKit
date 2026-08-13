import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { assertValidKey, createPresignedGet } from "@/lib/storage";

async function isRoomMember(userId: string, roomId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM messaging.room_members WHERE room_id = ${roomId} AND user_id = ${userId}
    ) AS exists`;
  return rows[0]?.exists ?? false;
}

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "missing key" }, { status: 400 });
  }

  try {
    assertValidKey(key);
  } catch {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }

  if (key.startsWith("chat/")) {
    const roomId = key.split("/")[1];
    if (!roomId || !(await isRoomMember(userId, roomId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const url = await createPresignedGet(key);
    return NextResponse.json({ key, url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to create url" },
      { status: 500 },
    );
  }
}
