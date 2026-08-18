import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tag } = await params;

  const target = await prisma.user.findUnique({
    where: { tag },
    select: { id: true, notifyFollows: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.id === userId) {
    return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
  }

  const followed = await prisma.$transaction(async (tx) => {
    const existing = await tx.follow.findUnique({
      where: {
        followerId_followingId: { followerId: userId, followingId: target.id },
      },
    });

    if (existing) {
      await tx.follow.delete({ where: { id: existing.id } });
      await Promise.all([
        tx.user.update({
          where: { id: target.id },
          data: { followers: { decrement: 1 } },
        }),
        tx.user.update({
          where: { id: userId },
          data: { following: { decrement: 1 } },
        }),
        tx.notification.deleteMany({
          where: { userId: target.id, actorId: userId, type: "follow" },
        }),
      ]);
      return false;
    }

    await tx.follow.create({ data: { followerId: userId, followingId: target.id } });
    await Promise.all([
      tx.user.update({
        where: { id: target.id },
        data: { followers: { increment: 1 } },
      }),
      tx.user.update({
        where: { id: userId },
        data: { following: { increment: 1 } },
      }),
      ...(target.notifyFollows
        ? [tx.notification.create({ data: { userId: target.id, actorId: userId, type: "follow" } })]
        : []),
    ]);
    return true;
  });

  const followers = await prisma.user.findUnique({
    where: { id: target.id },
    select: { followers: true },
  });

  return NextResponse.json({
    followed,
    followers: Number(followers?.followers ?? 0),
  });
}
