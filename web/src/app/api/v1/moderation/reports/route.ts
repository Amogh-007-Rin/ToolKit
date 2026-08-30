import prisma from "@/db";
import { apiError, apiJson } from "@/lib/apiResponse";
import { requireModerator } from "@/lib/authorization";

export async function GET(req: Request) {
  if (!await requireModerator()) return apiError(req, 403, "FORBIDDEN", "Moderator access required");
  const status = new URL(req.url).searchParams.get("status");
  const reports = await prisma.report.findMany({ where: status ? { status: status as never } : undefined, orderBy: { createdAt: "asc" }, take: 100 });
  return apiJson(req, { reports });
}
