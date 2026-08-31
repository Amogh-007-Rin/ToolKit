import prisma from "@/db";
import { apiError, apiJson } from "@/lib/apiResponse";
import { requireUser } from "@/lib/authorization";
import { revokeAllNativeSessions } from "@/lib/mobileAuth";
import { sendAccountNotice } from "@/lib/mailer";

const RECOVERY_DAYS = 30;

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");
  const scheduledAt = new Date(Date.now() + RECOVERY_DAYS * 86_400_000);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { hiddenAt: new Date(), deletionScheduledAt: scheduledAt } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.deviceRegistration.updateMany({ where: { userId: user.id }, data: { enabled: false } }),
  ]);
  await revokeAllNativeSessions(user.id);
  await sendAccountNotice(
    user.email,
    "ToolKit account deletion scheduled",
    `Your ToolKit account is scheduled for permanent deletion on ${scheduledAt.toISOString()}. Sign in through account restoration before that date to cancel deletion.`,
  );
  return apiJson(req, { deletionScheduledAt: scheduledAt.toISOString(), recoveryDays: RECOVERY_DAYS });
}
