import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let collectionIds: string[];
  try {
    const body = await req.json();
    const rawIds: unknown[] = Array.isArray(body.collectionIds) ? body.collectionIds : [];
    const stringIds = rawIds.filter((id): id is string => typeof id === "string");
    collectionIds = [...new Set<string>(stringIds)];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ownedCount = await prisma.collection.count({
    where: { id: { in: collectionIds }, userId },
  });
  if (ownedCount !== collectionIds.length) {
    return NextResponse.json({ error: "One or more collections were not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.collection.updateMany({ where: { userId }, data: { showcased: false } }),
    prisma.collection.updateMany({
      where: { userId, id: { in: collectionIds } },
      data: { showcased: true },
    }),
  ]);

  return NextResponse.json({ collectionIds });
}
