import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { commentCreateSchema } from "@/types/validation";
import { resolveStoredUrl } from "@/lib/storage";

const COMMENT_USER_SELECT = {
  id: true,
  name: true,
  image: true,
  tag: true,
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { postId: id },
    include: { user: { select: COMMENT_USER_SELECT } },
    orderBy: { createdAt: "asc" },
  });

  const resolved = await Promise.all(
    comments.map(async (c) => ({
      ...c,
      mine: c.userId === userId,
      user: { ...c.user, image: await resolveStoredUrl(c.user.image) },
    })),
  );

  return NextResponse.json({ comments: resolved });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const parsed = commentCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: { user: { select: { notifyComments: true } } },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId: id, userId, content: parsed.data.content },
      include: { user: { select: COMMENT_USER_SELECT } },
    });
    if (post.userId !== userId && post.user.notifyComments) {
      await tx.notification.create({
        data: {
          userId: post.userId,
          actorId: userId,
          postId: id,
          commentId: created.id,
          type: "comment",
        },
      });
    }
    return created;
  });

  return NextResponse.json(
    {
      comment: {
        ...comment,
        mine: true,
        user: { ...comment.user, image: await resolveStoredUrl(comment.user.image) },
      },
    },
    { status: 201 },
  );
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { commentId?: string };
  if (!body.commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.comment.deleteMany({
      where: { id: body.commentId, postId: id, userId },
    });
    if (deleted.count > 0) {
      await tx.notification.deleteMany({ where: { commentId: body.commentId } });
    }
    return deleted;
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
