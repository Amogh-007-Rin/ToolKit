import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { isOwnedObjectKey, putObject, validateMedia } from "@/lib/storage";
import prisma from "@/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = req.nextUrl.searchParams.get("key") ?? "";
  let allowed = isOwnedObjectKey(key, userId, "posts") || isOwnedObjectKey(key, userId, "profile");
  if (!allowed && key.startsWith("chat/")) {
    const roomId = key.split("/")[1];
    if (roomId) {
      const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM messaging.room_members WHERE room_id = ${roomId} AND user_id = ${userId}
        ) AS exists`;
      allowed = rows[0]?.exists ?? false;
    }
  }
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const contentType = req.headers.get("content-type") ?? "";
  const body = Buffer.from(await req.arrayBuffer());
  try {
    validateMedia(contentType, body.length);
    await putObject(key, body, contentType);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
