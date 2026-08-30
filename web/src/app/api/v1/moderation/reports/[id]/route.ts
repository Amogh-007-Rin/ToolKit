import prisma from "@/db";
import { apiError, apiJson } from "@/lib/apiResponse";
import { requireModerator } from "@/lib/authorization";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["REVIEWING", "ACTIONED", "DISMISSED", "APPEALED"]),
  action: z.enum(["review", "warn", "remove", "suspend", "dismiss"]),
  reason: z.string().trim().min(3).max(1000),
  confirmation: z.literal("CONFIRM").optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const moderator = await requireModerator();
  if (!moderator) return apiError(req, 403, "FORBIDDEN", "Moderator access required");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(req, 400, "VALIDATION_FAILED", "Invalid moderation action");
  if (["remove", "suspend"].includes(parsed.data.action) && parsed.data.confirmation !== "CONFIRM") return apiError(req, 409, "CONFIRMATION_REQUIRED", "Elevated confirmation required");
  const { id } = await context.params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return apiError(req, 404, "NOT_FOUND", "Report not found");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.moderationAction.create({ data: { reportId: id, moderatorId: moderator.id, action: parsed.data.action, targetType: report.targetType, targetId: report.targetId, reason: parsed.data.reason } });
    return tx.report.update({ where: { id }, data: { status: parsed.data.status, assignedToId: moderator.id } });
  });
  return apiJson(req, { report: updated });
}
