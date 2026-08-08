import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { resolveStoredUrl } from "@/lib/storage";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, image: true, tag: true },
  });

  const resolved = await Promise.all(
    users.map(async (user) => ({ ...user, image: await resolveStoredUrl(user.image) })),
  );

  return NextResponse.json({ users: resolved });
}
