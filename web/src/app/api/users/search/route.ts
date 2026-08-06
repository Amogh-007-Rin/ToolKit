import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      tag: { contains: q, mode: "insensitive" },
      NOT: { id: userId },
    },
    select: {
      id: true,
      name: true,
      image: true,
      tag: true,
      bio: true,
      location: true,
      role: true,
      skills: true,
      followers: true,
      following: true,
    },
    take: 20,
    orderBy: { tag: "asc" },
  });

  return NextResponse.json({
    users: users.map(({ followers, following, ...user }) => ({
      ...user,
      followers: Number(followers),
      following: Number(following),
    })),
  });
}
