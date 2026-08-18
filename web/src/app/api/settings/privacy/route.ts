import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

const SELECT = { discoverable: true, showPosts: true, showCollections: true } as const;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const preferences = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  if (!preferences) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ preferences });
}

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const allowed = ["discoverable", "showPosts", "showCollections"] as const;
  const data: Partial<Record<(typeof allowed)[number], boolean>> = {};
  for (const key of allowed) {
    if (key in body) {
      if (typeof body[key] !== "boolean") {
        return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
      }
      data[key] = body[key];
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No privacy preferences supplied" }, { status: 400 });
  }

  const preferences = await prisma.user.update({ where: { id: userId }, data, select: SELECT });
  return NextResponse.json({ preferences });
}
