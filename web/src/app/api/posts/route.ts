import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { postCreateSchema } from "@/types/validation";
import { assertValidKey, isOwnedObjectKey, resolveStoredUrl } from "@/lib/storage";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const authorId = searchParams.get("authorId");
  const where =
    filter === "saved"
      ? { saves: { some: { userId } } }
      : authorId
        ? { userId: authorId }
        : { userId };

  const posts = await prisma.post.findMany({
    where,
    include: {
      media: { orderBy: { order: "asc" } },
      user: { select: { name: true, tag: true } },
      _count: { select: { likes: true, comments: true, saves: true } },
      likes: { where: { userId }, select: { id: true } },
      saves: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const resolved = await Promise.all(
    posts.map(async ({ _count, likes, saves, user, media, ...post }) => ({
      ...post,
      author: user,
      media: await Promise.all(
        media.map(async (m) => ({ ...m, url: (await resolveStoredUrl(m.url)) as string })),
      ),
      likeCount: _count.likes,
      commentCount: _count.comments,
      savedCount: _count.saves,
      likedByMe: likes.length > 0,
      savedByMe: saves.length > 0,
      mine: post.userId === userId,
    })),
  );

  return NextResponse.json({ posts: resolved });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { caption?: unknown; tags?: unknown; media?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = postCreateSchema.safeParse({
    caption: body.caption ?? "",
    tags: body.tags ?? [],
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const tags = [...new Set(parsed.data.tags)];

  if (!Array.isArray(body.media) || body.media.length === 0) {
    return NextResponse.json({ error: "At least one media entry is required" }, { status: 400 });
  }

  const mediaInput: { key: string; type: string; order: number }[] = [];
  for (const entry of body.media) {
    if (!entry || typeof entry !== "object") {
      return NextResponse.json({ error: "Invalid media entry" }, { status: 400 });
    }
    const key = (entry as Record<string, unknown>).key;
    const type = (entry as Record<string, unknown>).type;
    const order = (entry as Record<string, unknown>).order;
    if (typeof key !== "string" || typeof type !== "string") {
      return NextResponse.json({ error: "Each media entry must have key and type" }, { status: 400 });
    }
    if (type !== "image" && type !== "video") {
      return NextResponse.json({ error: "Media type must be image or video" }, { status: 400 });
    }
    try {
      assertValidKey(key);
    } catch {
      return NextResponse.json({ error: "Invalid media key" }, { status: 400 });
    }
    if (!isOwnedObjectKey(key, userId, "posts")) {
      return NextResponse.json({ error: "Media key does not belong to this user" }, { status: 403 });
    }
    mediaInput.push({ key, type, order: typeof order === "number" && order >= 0 ? order : mediaInput.length });
  }

  const videos = mediaInput.filter((m) => m.type === "video");
  if (videos.length > 1) {
    return NextResponse.json({ error: "Only one video per post is allowed" }, { status: 400 });
  }
  if (videos.length === 1 && mediaInput.length > 1) {
    return NextResponse.json({ error: "A video cannot be combined with other media" }, { status: 400 });
  }

  try {
    const post = await prisma.post.create({
      data: {
        userId,
        caption: parsed.data.caption,
        tags,
        media: {
          create: mediaInput.map((m) => ({ url: m.key, type: m.type, order: m.order })),
        },
      },
      include: { media: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create post" },
      { status: 400 },
    );
  }
}
