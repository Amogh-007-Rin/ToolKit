import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

const MAX_TITLE_LEN = 60;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await prisma.aIChat.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const list = chats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    lastMessage: chat.messages[0]?.content ?? null,
  }));

  return NextResponse.json({ chats: list });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query: string | undefined;
  try {
    const body = await req.json();
    query = typeof body.query === "string" ? body.query.trim() : undefined;
  } catch {
    // body optional — create a blank chat
  }

  const title = query && query.length > 0 ? query.slice(0, MAX_TITLE_LEN) : "New chat";

  const chat = await prisma.aIChat.create({
    data: { userId, title },
  });

  return NextResponse.json(
    {
      chat: {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
