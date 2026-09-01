import prisma from "@/db";
import { apiError, apiJson } from "@/lib/apiResponse";
import { getSessionUserId } from "@/lib/session";
import { idempotent } from "@/lib/idempotency";
import { z } from "zod";

const deviceSchema = z.object({
  expoToken: z.string().trim().regex(/^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/).max(255),
  platform: z.enum(["ios", "android"]),
  appVersion: z.string().trim().min(1).max(40),
  locale: z.string().trim().min(2).max(20).default("en"),
});

async function post(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  const parsed = deviceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(req, 400, "VALIDATION_FAILED", "Invalid device registration");
  const device = await prisma.deviceRegistration.upsert({
    where: { expoToken: parsed.data.expoToken },
    create: { userId, ...parsed.data },
    update: { userId, ...parsed.data, enabled: true, lastActiveAt: new Date() },
    select: { id: true, platform: true, enabled: true, lastActiveAt: true },
  });
  return apiJson(req, { device }, 201);
}

export const POST = idempotent("devices.register", post);

export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return apiError(req, 400, "VALIDATION_FAILED", "Device token required");
  const result = await prisma.deviceRegistration.updateMany({ where: { userId, expoToken: token }, data: { enabled: false } });
  return apiJson(req, { updated: result.count });
}
