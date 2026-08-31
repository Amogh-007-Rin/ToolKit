import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { resolveStoredUrl } from "@/lib/storage";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 30), 1), 30);
  const type = searchParams.get("type");
  const unreadOnly = searchParams.get("unread") === "true";
  const allowedTypes = new Set(["follow", "like", "comment", "message"]);
  const where = {
    userId,
    ...(type && allowedTypes.has(type) ? { type } : {}),
    ...(unreadOnly ? { read: false } : {}),
  };

  const [notifications, unreadCount, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        actor: { select: { name: true, image: true, tag: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.count({ where: { userId } }),
  ]);

  const resolved = await Promise.all(
    notifications.map(async (notification) => ({
      ...notification,
      actor: {
        ...notification.actor,
        image: await resolveStoredUrl(notification.actor.image),
      },
    })),
  );

  return NextResponse.json({ notifications: resolved, unreadCount, totalCount });
}

export async function PATCH() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count } = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ updated: count });
}

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count } = await prisma.notification.deleteMany({
    where: { userId },
  });

  return NextResponse.json({ deleted: count });
}
