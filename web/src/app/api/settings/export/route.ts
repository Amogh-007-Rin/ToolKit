import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      tag: true,
      bio: true,
      location: true,
      role: true,
      skills: true,
      createdAt: true,
      updatedAt: true,
      notifyFollows: true,
      notifyLikes: true,
      notifyComments: true,
      collections: { include: { tools: true }, orderBy: { createdAt: "desc" } },
      posts: {
        include: { media: true, comments: true, likes: true, saves: true },
        orderBy: { createdAt: "desc" },
      },
      followingRel: { select: { followingId: true, createdAt: true } },
      followersRel: { select: { followerId: true, createdAt: true } },
      notifications: { orderBy: { createdAt: "desc" } },
      aiChats: { include: { messages: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), user }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="toolkit-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
