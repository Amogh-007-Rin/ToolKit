import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  if (!result.count) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  return NextResponse.json({ read: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  if (notification.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.notification.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
