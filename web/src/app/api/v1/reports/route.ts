import prisma from "@/db";
import { apiError, apiJson } from "@/lib/apiResponse";
import { requireUser } from "@/lib/authorization";
import { z } from "zod";

const schema = z.object({
  targetType: z.enum(["profile", "post", "comment", "message"]),
  targetId: z.string().trim().min(1).max(100),
  reason: z.enum(["spam", "harassment", "hate", "sexual", "violence", "self_harm", "impersonation", "privacy", "other"]),
  description: z.string().trim().max(1000).optional(),
  messageEvidence: z.object({ roomId: z.string().max(100), senderId: z.string().max(100), content: z.string().max(4000), createdAt: z.string().datetime() }).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(req, 400, "VALIDATION_FAILED", "Invalid report", parsed.error.flatten());
  const { targetType, targetId } = parsed.data;
  let evidence: object | null = null;
  if (targetType === "profile") evidence = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, name: true, tag: true, bio: true, image: true } });
  if (targetType === "post") evidence = await prisma.post.findUnique({ where: { id: targetId }, select: { id: true, userId: true, caption: true, tags: true, createdAt: true, media: { select: { url: true, type: true } } } });
  if (targetType === "comment") evidence = await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true, userId: true, postId: true, content: true, createdAt: true } });
  if (targetType === "message" && parsed.data.messageEvidence) evidence = parsed.data.messageEvidence;
  if (!evidence) return apiError(req, 404, "NOT_FOUND", "Reported content not found");
  const report = await prisma.report.create({ data: { reporterId: user.id, targetType, targetId, reason: parsed.data.reason, description: parsed.data.description, evidence }, select: { id: true, status: true, createdAt: true } });
  return apiJson(req, { report }, 201);
}
