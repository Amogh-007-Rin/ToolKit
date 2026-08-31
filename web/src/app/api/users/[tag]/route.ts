import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { resolveStoredUrl } from "@/lib/storage";
import { usersBlockEachOther } from "@/lib/blocks";

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
  if (user.id !== userId && await usersBlockEachOther(userId, user.id)) return NextResponse.json({ code: "BLOCKED", error: "Profile unavailable" }, { status: 403 });

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
  const posts = user.id === userId || user.showPosts ? await prisma.post.findMany({
    where: { userId: user.id },
    include: {
      media: { orderBy: { order: "asc" } },
      _count: { select: { likes: true, comments: true, saves: true } },
      likes: { where: { userId }, select: { id: true } },
      saves: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  }) : [];

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
      posts: await Promise.all(posts.map(async (post) => ({
        id: post.id,
        caption: post.caption,
        tags: post.tags,
        createdAt: post.createdAt,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        savedCount: post._count.saves,
        likedByMe: post.likes.length > 0,
        savedByMe: post.saves.length > 0,
        author: { id: user.id, name: user.name, tag: user.tag, image },
        media: await Promise.all(post.media.map(async (media) => ({ id: media.id, type: media.type, url: await resolveStoredUrl(media.url) }))),
      }))),
    },
  });
}
