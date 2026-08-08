import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { profileUpdateSchema } from "@/types/validation";
import { resolveStoredUrl } from "@/lib/storage";
import { Prisma } from "../../../../generated/prisma/client";

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

  const { name, bio, role, location, skills, tag } = parsed.data;

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
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        role: true,
        location: true,
        skills: true,
        tag: true,
      },
    });

    return NextResponse.json({ user: { ...user, image: await resolveStoredUrl(user.image) } });
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
