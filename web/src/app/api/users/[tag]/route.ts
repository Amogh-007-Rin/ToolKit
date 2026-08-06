import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tag } = await params;

  const user = await prisma.user.findUnique({
    where: { tag },
    select: {
      id: true,
      name: true,
      image: true,
      tag: true,
      bio: true,
      role: true,
      location: true,
      skills: true,
      followers: true,
      following: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const followedByMe =
    user.id !== userId
      ? await prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId: userId, followingId: user.id },
          },
          select: { id: true },
        })
      : null;

  return NextResponse.json({
    user: {
      ...user,
      followers: Number(user.followers),
      following: Number(user.following),
      followedByMe: followedByMe !== null,
      isMe: user.id === userId,
    },
  });
}
