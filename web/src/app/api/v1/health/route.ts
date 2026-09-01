import prisma from "@/db";
import { apiError, apiJson } from "@/lib/apiResponse";

export async function GET(req: Request) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return apiJson(req, {
      status: "ready",
      service: "toolkit-api-v1",
      database: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return apiError(req, 503, "SERVICE_UNAVAILABLE", "Database is not ready");
  }
}
