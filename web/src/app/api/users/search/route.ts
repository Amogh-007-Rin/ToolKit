import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { resolveStoredUrl } from "@/lib/storage";
import { blockedUserIds } from "@/lib/blocks";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const excludedIds = [userId, ...await blockedUserIds(userId)];

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: excludedIds },
      discoverable: true,
      hiddenAt: null,
      ...(q
        ? {
            OR: [
              { tag: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
              { role: { contains: q, mode: "insensitive" as const } },
              { skills: { has: q } },
            ],
          }
        : {}),
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
      createdAt: true,
    },
    take: 20,
    orderBy: q ? { tag: "asc" } : [{ followers: "desc" }, { createdAt: "desc" }],
  });

  const resolved = await Promise.all(
    users.map(async ({ followers, following, image, ...user }) => ({
      ...user,
      image: await resolveStoredUrl(image),
      followers: Number(followers),
      following: Number(following),
    })),
  );

  return NextResponse.json({ users: resolved });
}
