import prisma from "@/db";
import { apiError, apiJson } from "@/lib/apiResponse";
import { createNativeSession } from "@/lib/mobileAuth";
import { verifyPassword } from "@/lib/password";
import { credentialsSchema } from "@/types/validation";

export async function POST(req: Request) {
  const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(req, 400, "VALIDATION_FAILED", "Invalid credentials");
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.password || !user.hiddenAt || !user.deletionScheduledAt || user.deletionScheduledAt <= new Date() || !(await verifyPassword(parsed.data.password, user.password))) {
    return apiError(req, 401, "INVALID_CREDENTIALS", "Account cannot be restored");
  }
  await prisma.user.update({ where: { id: user.id }, data: { hiddenAt: null, deletionScheduledAt: null } });
  const session = await createNativeSession(
    { id: user.id, email: user.email, name: user.name, image: user.image, tag: user.tag },
    { deviceName: req.headers.get("x-device-name") ?? undefined, userAgent: req.headers.get("user-agent") ?? undefined },
  );
  return apiJson(req, session);
}
