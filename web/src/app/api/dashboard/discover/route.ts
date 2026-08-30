import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { resolveStoredUrl } from "@/lib/storage";
import { blockedUserIds } from "@/lib/blocks";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const excludedIds = [userId, ...await blockedUserIds(userId)];

  const [posts, collections, creators] = await Promise.all([
    prisma.post.findMany({
      where: {
        userId: { notIn: excludedIds },
        user: { discoverable: true, showPosts: true, hiddenAt: null },
      },
      include: {
        media: { orderBy: { order: "asc" } },
        user: { select: { id: true, name: true, image: true, tag: true } },
        _count: { select: { likes: true, comments: true, saves: true } },
        likes: { where: { userId }, select: { id: true } },
        saves: { where: { userId }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.collection.findMany({
      where: {
        showcased: true,
        userId: { notIn: excludedIds },
        user: { discoverable: true, showCollections: true, hiddenAt: null },
      },
      include: {
        tools: {
          orderBy: { createdAt: "desc" },
          take: 6,
        },
        user: { select: { id: true, name: true, image: true, tag: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 16,
    }),
    prisma.user.findMany({
      where: { id: { notIn: excludedIds }, discoverable: true, hiddenAt: null },
      select: {
        id: true,
        name: true,
        image: true,
        tag: true,
        role: true,
        followers: true,
      },
      orderBy: [{ followers: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);

  const resolvedPosts = await Promise.all(
    posts.map(async (post) => ({
      id: post.id,
      caption: post.caption,
      tags: post.tags,
      createdAt: post.createdAt.toISOString(),
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      savedCount: post._count.saves,
      likedByMe: post.likes.length > 0,
      savedByMe: post.saves.length > 0,
      author: {
        id: post.user.id,
        name: post.user.name,
        tag: post.user.tag,
        image: await resolveStoredUrl(post.user.image),
      },
      media: await Promise.all(
        post.media.map(async (item) => ({
          id: item.id,
          type: item.type,
          url: (await resolveStoredUrl(item.url)) as string,
        })),
      ),
    })),
  );

  const resolvedCollections = await Promise.all(
    collections.map(async (collection) => ({
      id: collection.id,
      title: collection.title,
      description: collection.description,
      toolCount: collection.tools.length,
      updatedAt: collection.updatedAt.toISOString(),
      owner: {
        id: collection.user.id,
        name: collection.user.name,
        tag: collection.user.tag,
        image: await resolveStoredUrl(collection.user.image),
      },
      tools: collection.tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        link: tool.link,
        icon: tool.icon,
        logoUrl: tool.logoUrl,
        description: tool.description,
        reason: tool.reason,
      })),
    })),
  );

  const sponsoredTools = resolvedCollections
    .flatMap((collection) =>
      collection.tools
        .filter((tool) => Boolean(tool.link))
        .map((tool) => ({
          ...tool,
          collectionId: collection.id,
          collectionTitle: collection.title,
          owner: collection.owner,
        })),
    )
    .slice(0, 18);

  const resolvedCreators = await Promise.all(
    creators.map(async (creator) => ({
      ...creator,
      image: await resolveStoredUrl(creator.image),
      followers: Number(creator.followers),
    })),
  );

  return NextResponse.json({
    posts: resolvedPosts,
    collections: resolvedCollections,
    sponsoredTools,
    creators: resolvedCreators,
  });
}
