import prisma from "@/db";
import { apiError, apiJson } from "@/lib/apiResponse";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  return apiJson(req, { blocks: await prisma.block.findMany({ where: { blockerId: userId }, orderBy: { createdAt: "desc" } }) });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  const body = await req.json().catch(() => null) as { userId?: unknown } | null;
  if (typeof body?.userId !== "string" || body.userId === userId || body.userId.length > 100) return apiError(req, 400, "VALIDATION_FAILED", "Invalid user");
  const exists = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } });
  if (!exists) return apiError(req, 404, "NOT_FOUND", "User not found");
  const block = await prisma.$transaction(async (tx) => {
    const created = await tx.block.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: body.userId as string } }, create: { blockerId: userId, blockedId: body.userId as string }, update: {} });
    await tx.follow.deleteMany({ where: { OR: [{ followerId: userId, followingId: body.userId as string }, { followerId: body.userId as string, followingId: userId }] } });
    return created;
  });
  return apiJson(req, { block }, 201);
}

export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  const blockedId = new URL(req.url).searchParams.get("userId");
  if (!blockedId) return apiError(req, 400, "VALIDATION_FAILED", "User required");
  const result = await prisma.block.deleteMany({ where: { blockerId: userId, blockedId } });
  return apiJson(req, { deleted: result.count });
}
