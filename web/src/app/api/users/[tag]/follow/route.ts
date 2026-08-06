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
    select: { id: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.id === userId) {
    return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: userId, followingId: target.id },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    await prisma.user.update({
      where: { id: target.id },
      data: { followers: { decrement: 1 } },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { following: { decrement: 1 } },
    });
  } else {
    await prisma.follow.create({ data: { followerId: userId, followingId: target.id } });
    await prisma.user.update({
      where: { id: target.id },
      data: { followers: { increment: 1 } },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { following: { increment: 1 } },
    });
    await prisma.notification.create({
      data: { userId: target.id, actorId: userId, type: "follow" },
    });
  }

  const followers = await prisma.user.findUnique({
    where: { id: target.id },
    select: { followers: true },
  });

  return NextResponse.json({
    followed: !existing,
    followers: Number(followers?.followers ?? 0),
  });
}
