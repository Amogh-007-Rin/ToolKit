import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import {
  assertValidKey,
  deleteObject,
  isStoredKey,
  resolveStoredUrl,
} from "@/lib/storage";

async function removeOldObject(value: string | null | undefined): Promise<void> {
  if (!isStoredKey(value)) {
    return;
  }
  try {
    await deleteObject(value as string);
  } catch {
    // best-effort cleanup
  }
}

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { imageKey?: unknown; bannerKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { imageKey, bannerKey } = body;

  const data: { image?: string; banner?: string } = {};
  if (imageKey !== undefined) {
    if (typeof imageKey !== "string") {
      return NextResponse.json({ error: "imageKey must be a string" }, { status: 400 });
    }
    try {
      assertValidKey(imageKey);
    } catch {
      return NextResponse.json({ error: "invalid image key" }, { status: 400 });
    }
    if (!imageKey.startsWith(`profile/${userId}/`) || imageKey.startsWith(`profile/${userId}/banner/`)) {
      return NextResponse.json({ error: "image key does not belong to your profile" }, { status: 403 });
    }
    data.image = imageKey;
  }
  if (bannerKey !== undefined) {
    if (typeof bannerKey !== "string") {
      return NextResponse.json({ error: "bannerKey must be a string" }, { status: 400 });
    }
    try {
      assertValidKey(bannerKey);
    } catch {
      return NextResponse.json({ error: "invalid banner key" }, { status: 400 });
    }
    if (!bannerKey.startsWith(`profile/${userId}/banner/`)) {
      return NextResponse.json({ error: "banner key does not belong to your profile" }, { status: 403 });
    }
    data.banner = bannerKey;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, image: true, banner: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { image: true, banner: true },
  });

  if (imageKey && user.image !== imageKey) {
    await removeOldObject(user.image);
  }
  if (bannerKey && user.banner !== bannerKey) {
    await removeOldObject(user.banner);
  }

  const [image, banner] = await Promise.all([
    resolveStoredUrl(updated.image),
    resolveStoredUrl(updated.banner),
  ]);

  return NextResponse.json({ user: { image, banner } });
}
