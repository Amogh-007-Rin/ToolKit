import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { createPresignedPut, newObjectKey, validateMedia } from "@/lib/storage";

type Scope = "chat" | "post" | "profile" | "banner";

async function isRoomMember(userId: string, roomId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM messaging.room_members WHERE room_id = ${roomId} AND user_id = ${userId}
    ) AS exists`;
  return rows[0]?.exists ?? false;
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { scope?: Scope; roomId?: string; contentType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { scope, roomId, contentType, size } = body;
  if (!scope || !contentType || typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0) {
    return NextResponse.json({ error: "missing scope, contentType or size" }, { status: 400 });
  }

  let kind: "image" | "video";
  try {
    kind = validateMedia(contentType, size);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid file" },
      { status: 400 },
    );
  }

  let prefix: string;
  switch (scope) {
    case "chat":
      if (!roomId) {
        return NextResponse.json({ error: "roomId is required for chat uploads" }, { status: 400 });
      }
      if (!(await isRoomMember(userId, roomId))) {
        return NextResponse.json({ error: "not a member of this room" }, { status: 403 });
      }
      prefix = `chat/${roomId}`;
      break;
    case "post":
      prefix = `posts/${userId}`;
      break;
    case "profile":
      prefix = `profile/${userId}`;
      break;
    case "banner":
      prefix = `profile/${userId}/banner`;
      break;
    default:
      return NextResponse.json({ error: "invalid scope" }, { status: 400 });
  }

  try {
    const key = newObjectKey(prefix, contentType);
    const { uploadUrl, expiresAt } = await createPresignedPut(key, contentType, size);
    return NextResponse.json({ key, kind, uploadUrl, expiresAt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to create upload" },
      { status: 500 },
    );
  }
}
