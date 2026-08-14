import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { postCreateSchema } from "@/types/validation";
import {
  assertValidKey,
  deleteObject,
  isOwnedObjectKey,
  isStoredKey,
  resolveStoredUrl,
} from "@/lib/storage";
import type { Prisma } from "../../../../../generated/prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.post.findFirst({
    where: { id, userId },
    include: { media: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  let body: { caption?: unknown; tags?: unknown; removedMediaIds?: unknown; media?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let removedMediaIds: string[];
  if (Array.isArray(body.removedMediaIds)) {
    removedMediaIds = body.removedMediaIds.filter((id): id is string => typeof id === "string");
  } else {
    removedMediaIds = [];
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

  interface MediaEntry {
    id?: string;
    key?: string;
    type?: string;
  }

  const mediaEntries: MediaEntry[] = [];
  if (Array.isArray(body.media)) {
    for (const entry of body.media) {
      if (!entry || typeof entry !== "object") {
        return NextResponse.json({ error: "Invalid media entry" }, { status: 400 });
      }
      mediaEntries.push(entry as MediaEntry);
    }
  }

  const keepIds = new Set(
    post.media.filter((m) => !removedMediaIds.includes(m.id)).map((m) => m.id),
  );

  let newMediaIndex = 0;
  for (const entry of mediaEntries) {
    if (typeof entry.id === "string" && keepIds.has(entry.id)) {
      continue;
    }
    if (entry.key) {
      if (typeof entry.key !== "string" || typeof entry.type !== "string") {
        return NextResponse.json({ error: "New media entries must have key and type" }, { status: 400 });
      }
      if (entry.type !== "image" && entry.type !== "video") {
        return NextResponse.json({ error: "Media type must be image or video" }, { status: 400 });
      }
      try {
        assertValidKey(entry.key);
      } catch {
        return NextResponse.json({ error: "Invalid media key" }, { status: 400 });
      }
      if (!isOwnedObjectKey(entry.key, userId, "posts")) {
        return NextResponse.json({ error: "Media key does not belong to this user" }, { status: 403 });
      }
      newMediaIndex++;
    }
  }

  const newMediaCount = newMediaIndex;
  const totalVideos =
    post.media.filter((m) => keepIds.has(m.id) && m.type === "video").length +
    mediaEntries.filter((e) => e.key && e.type === "video").length;
  if (totalVideos > 1) {
    return NextResponse.json({ error: "Only one video per post is allowed" }, { status: 400 });
  }
  if (totalVideos === 1 && keepIds.size + newMediaCount > 1) {
    return NextResponse.json({ error: "A video cannot be combined with other media" }, { status: 400 });
  }

  const remainingCount = keepIds.size + newMediaCount;
  if (remainingCount <= 0) {
    return NextResponse.json({ error: "A post must have at least one image or video" }, { status: 400 });
  }

  try {
    const removedMedia = post.media.filter((m) => removedMediaIds.includes(m.id));

    const orderOps: Prisma.PrismaPromise<unknown>[] = [];
    let newIdx = 0;
    mediaEntries.forEach((entry, index) => {
      if (typeof entry.id === "string" && keepIds.has(entry.id)) {
        orderOps.push(
          prisma.postMedia.update({ where: { id: entry.id }, data: { order: index } }),
        );
      } else if (entry.key && newIdx < newMediaCount) {
        orderOps.push(
          prisma.postMedia.create({
            data: { url: entry.key, type: entry.type!, order: index, postId: id },
          }),
        );
        newIdx++;
      }
    });

    await prisma.$transaction([
      prisma.postMedia.deleteMany({
        where: { id: { in: removedMediaIds }, postId: id },
      }),
      prisma.post.update({
        where: { id },
        data: { caption: parsed.data.caption, tags },
      }),
      ...orderOps,
    ]);

    for (const m of removedMedia) {
      if (isStoredKey(m.url) && isOwnedObjectKey(m.url, userId, "posts")) {
        await deleteObject(m.url).catch(() => {});
      }
    }

    const updated = await prisma.post.findUnique({
      where: { id },
      include: { media: { orderBy: { order: "asc" } } },
    });

    if (updated) {
      updated.media = await Promise.all(
        updated.media.map(async (m) => ({
          ...m,
          url: (await resolveStoredUrl(m.url)) as string,
        })),
      );
    }

    return NextResponse.json({ post: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update post" },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.post.findFirst({
    where: { id, userId },
    include: { media: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await prisma.post.delete({ where: { id } });

  for (const m of post.media) {
    if (isStoredKey(m.url) && isOwnedObjectKey(m.url, userId, "posts")) {
      await deleteObject(m.url).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
