import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findFirst({
    where: { id: userId, hiddenAt: null },
    select: { id: true, accessRole: true, email: true },
  });
}

export async function requireModerator() {
  const user = await requireUser();
  return user && (user.accessRole === "MODERATOR" || user.accessRole === "ADMIN") ? user : null;
}
