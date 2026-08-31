import prisma from "@/db";
import { apiError, apiJson } from "@/lib/apiResponse";
import { getAuthenticatedUserId } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ moderationActionId: z.string().min(1).max(100), statement: z.string().trim().min(10).max(2000) });

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(req, 400, "VALIDATION_FAILED", "A valid appeal statement is required");
  const action = await prisma.moderationAction.findUnique({ where: { id: parsed.data.moderationActionId } });
  if (!action || action.targetType !== "profile" || action.targetId !== userId) return apiError(req, 404, "NOT_FOUND", "Moderation action not found");
  const existing = await prisma.report.findFirst({ where: { reporterId: userId, targetType: "appeal", targetId: action.id, status: { in: ["OPEN", "REVIEWING", "APPEALED"] } } });
  if (existing) return apiError(req, 409, "CONFLICT", "An appeal is already under review");
  const appeal = await prisma.report.create({
    data: { reporterId: userId, targetType: "appeal", targetId: action.id, reason: "moderation_appeal", description: parsed.data.statement, evidence: { moderationActionId: action.id, action: action.action, reason: action.reason }, status: "APPEALED" },
    select: { id: true, status: true, createdAt: true },
  });
  return apiJson(req, { appeal }, 201);
}
