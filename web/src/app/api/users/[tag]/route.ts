import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { resolveStoredUrl } from "@/lib/storage";

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
      banner: true,
      tag: true,
      bio: true,
      role: true,
      location: true,
      skills: true,
      followers: true,
      following: true,
      showPosts: true,
      showCollections: true,
      collections: {
        where: { showcased: true },
        include: { tools: true },
        orderBy: { updatedAt: "desc" },
      },
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

  const [image, banner] = await Promise.all([
    resolveStoredUrl(user.image),
    resolveStoredUrl(user.banner),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      collections: user.id === userId || user.showCollections ? user.collections : [],
      image,
      banner,
      followers: Number(user.followers),
      following: Number(user.following),
      followedByMe: followedByMe !== null,
      isMe: user.id === userId,
    },
  });
}
