import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: { user: { select: { notifyLikes: true } } },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId: id, userId } },
  });

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.like.delete({ where: { id: existing.id } });
      await tx.notification.deleteMany({
        where: { userId: post.userId, actorId: userId, postId: id, type: "like" },
      });
      return;
    }

    await tx.like.create({ data: { postId: id, userId } });
    if (post.userId !== userId && post.user.notifyLikes) {
      await tx.notification.create({
        data: { userId: post.userId, actorId: userId, postId: id, type: "like" },
      });
      await tx.notificationOutbox.upsert({
        where: { dedupeKey: `like:${id}:${userId}` },
        create: { userId: post.userId, eventType: "like", payload: { postId: id, actorId: userId, summary: "Someone liked your post" }, dedupeKey: `like:${id}:${userId}` },
        update: { deliveredAt: null, attempts: 0, availableAt: new Date(), lastError: null },
      });
    }
  });

  const likeCount = await prisma.like.count({ where: { postId: id } });
  return NextResponse.json({ liked: !existing, likeCount });
}
