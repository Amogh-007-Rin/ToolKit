import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { postCreateSchema } from "@/types/validation";
import { saveFile } from "@/lib/media";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.post.findMany({
    where: { userId },
    include: {
      media: { orderBy: { order: "asc" } },
      user: { select: { name: true, tag: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    posts: posts.map(({ _count, likes, user, ...post }) => ({
      ...post,
      author: user,
      likeCount: _count.likes,
      commentCount: _count.comments,
      likedByMe: likes.length > 0,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
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
  if (files.length === 0) {
    return NextResponse.json({ error: "At least one image or video is required" }, { status: 400 });
  }

  const videos = files.filter((f) => f.type.startsWith("video"));
  if (videos.length > 1) {
    return NextResponse.json({ error: "Only one video per post is allowed" }, { status: 400 });
  }
  if (videos.length === 1 && files.length > 1) {
    return NextResponse.json({ error: "A video cannot be combined with other media" }, { status: 400 });
  }

  try {
    const media = await Promise.all(files.map((file, index) => saveFile(file, index)));

    const post = await prisma.post.create({
      data: {
        userId,
        caption: parsed.data.caption,
        tags,
        media: {
          create: media.map((m, index) => ({ ...m, order: index })),
        },
      },
      include: { media: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create post" },
      { status: 400 }
    );
  }
}
