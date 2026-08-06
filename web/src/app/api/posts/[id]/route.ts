import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { postCreateSchema } from "@/types/validation";
import { saveFile, deleteFilesByUrls } from "@/lib/media";
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  let removedMediaIds: string[];
  try {
    removedMediaIds = JSON.parse((formData.get("removedMediaIds") as string) ?? "[]");
  } catch {
    return NextResponse.json({ error: "Invalid removed media payload" }, { status: 400 });
  }

  let mediaOrder: { id?: string | null; new?: boolean }[] | null = null;
  try {
    const raw = formData.get("mediaOrder") as string | null;
    if (raw) {
      const parsed = JSON.parse(raw);
      mediaOrder = Array.isArray(parsed) ? parsed : null;
    }
  } catch {
    return NextResponse.json({ error: "Invalid media order payload" }, { status: 400 });
  }

  const parsed = postCreateSchema.safeParse({
    caption: (formData.get("caption") as string) ?? "",
    tags: JSON.parse((formData.get("tags") as string) ?? "[]"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const tags = [...new Set(parsed.data.tags)];

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  const videos = files.filter((f) => f.type.startsWith("video"));
  if (videos.length > 1) {
    return NextResponse.json({ error: "Only one video per post is allowed" }, { status: 400 });
  }
  if (videos.length === 1 && files.length > 1) {
    return NextResponse.json({ error: "A video cannot be combined with other media" }, { status: 400 });
  }

  const remainingCount = post.media.length - removedMediaIds.length + files.length;
  if (remainingCount <= 0) {
    return NextResponse.json({ error: "A post must have at least one image or video" }, { status: 400 });
  }

  try {
    const removedMedia = post.media.filter((m) => removedMediaIds.includes(m.id));
    const newMedia = await Promise.all(files.map((file, index) => saveFile(file, index)));

    const keepIds = new Set(
      post.media.filter((m) => !removedMediaIds.includes(m.id)).map((m) => m.id)
    );

    const orderOps: Prisma.PrismaPromise<unknown>[] = [];
    let newMediaIndex = 0;
    mediaOrder?.forEach((entry, index) => {
      if (typeof entry?.id === "string" && keepIds.has(entry.id)) {
        orderOps.push(
          prisma.postMedia.update({ where: { id: entry.id }, data: { order: index } })
        );
      } else if (entry?.new === true && newMediaIndex < newMedia.length) {
        const media = newMedia[newMediaIndex++];
        orderOps.push(
          prisma.postMedia.create({ data: { ...media, order: index, postId: id } })
        );
      }
    });
    for (let i = newMediaIndex; i < newMedia.length; i++) {
      orderOps.push(
        prisma.postMedia.create({
          data: { ...newMedia[i], order: post.media.length + i, postId: id },
        })
      );
    }

    await prisma.$transaction([
      prisma.postMedia.deleteMany({
        where: { id: { in: removedMediaIds }, postId: id },
      }),
      prisma.post.update({
        where: { id },
        data: {
          caption: parsed.data.caption,
          tags,
        },
      }),
      ...orderOps,
    ]);

    await deleteFilesByUrls(removedMedia.map((m) => m.url));

    const updated = await prisma.post.findUnique({
      where: { id },
      include: { media: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update post" },
      { status: 400 }
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
  await deleteFilesByUrls(post.media.map((m) => m.url));

  return NextResponse.json({ ok: true });
}
