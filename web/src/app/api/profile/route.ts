import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { profileUpdateSchema } from "@/types/validation";
import { assertValidKey, isOwnedObjectKey, resolveStoredUrl } from "@/lib/storage";
import { Prisma } from "../../../../generated/prisma/client";
import { checkContentPolicy } from "@/lib/contentSafety";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      banner: true,
      bio: true,
      role: true,
      location: true,
      skills: true,
      tag: true,
      followers: true,
      following: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [image, banner] = await Promise.all([
    resolveStoredUrl(user.image),
    resolveStoredUrl(user.banner),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      image,
      banner,
      followers: Number(user.followers),
      following: Number(user.following),
    },
  });
}

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = profileUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, bio, role, location, skills, tag, image, banner } = parsed.data;
  const policy = checkContentPolicy([name, bio, role, location, ...skills].join("\n"));
  if (!policy.allowed) return NextResponse.json({ code: policy.code, error: policy.message }, { status: 422 });
  for (const [field, value] of [["image", image], ["banner", banner]] as const) {
    if (value) {
      try { assertValidKey(value); } catch { return NextResponse.json({ code: "VALIDATION_FAILED", error: `Invalid ${field} key` }, { status: 400 }); }
      if (!isOwnedObjectKey(value, userId, "profile")) return NextResponse.json({ code: "FORBIDDEN", error: `${field} does not belong to this user` }, { status: 403 });
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        bio: bio || null,
        role: role || null,
        location: location || null,
        skills: skills,
        tag: tag?.trim() || null,
        ...(image !== undefined ? { image } : {}),
        ...(banner !== undefined ? { banner } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        banner: true,
        bio: true,
        role: true,
        location: true,
        skills: true,
        tag: true,
      },
    });

    const [resolvedImage, resolvedBanner] = await Promise.all([resolveStoredUrl(user.image), resolveStoredUrl(user.banner)]);
    return NextResponse.json({ user: { ...user, image: resolvedImage, banner: resolvedBanner } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This toolkit tag is already taken" },
        { status: 409 }
      );
    }
    throw error;
  }
}
