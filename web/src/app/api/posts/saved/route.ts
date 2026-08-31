import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { resolveStoredUrl } from "@/lib/storage";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const saves = await prisma.savedPost.findMany({
    where: { userId, post: { user: { hiddenAt: null, suspendedAt: null } } },
    include: {
      post: {
        include: {
          user: { select: { id: true, name: true, tag: true, image: true } },
          media: { orderBy: { order: "asc" } },
          _count: { select: { likes: true, comments: true, saves: true } },
          likes: { where: { userId }, select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const posts = await Promise.all(saves.map(async ({ post }) => ({
    id: post.id,
    caption: post.caption,
    tags: post.tags,
    createdAt: post.createdAt,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    savedCount: post._count.saves,
    likedByMe: post.likes.length > 0,
    savedByMe: true,
    author: { ...post.user, image: await resolveStoredUrl(post.user.image) },
    media: await Promise.all(post.media.map(async (media) => ({ id: media.id, type: media.type, url: await resolveStoredUrl(media.url) }))),
  })));
  return NextResponse.json({ posts });
}
