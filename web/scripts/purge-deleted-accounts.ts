import "dotenv/config";
import prisma from "../db/index";
import { deleteObject, isStoredKey } from "../src/lib/storage";

interface MessageAttachmentRow {
  attachments: unknown;
}

function attachmentKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || !("key" in item)) return [];
    const key = (item as { key?: unknown }).key;
    return typeof key === "string" && isStoredKey(key) ? [key] : [];
  });
}

async function purgeUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      image: true,
      banner: true,
      posts: { select: { media: { select: { url: true } } } },
    },
  });
  if (!user) return;

  const messageMedia = await prisma.$queryRawUnsafe<MessageAttachmentRow[]>(
    `SELECT attachments FROM messaging.messages WHERE sender_id = $1`,
    userId,
  );
  const objectKeys = new Set<string>();
  for (const value of [user.image, user.banner, ...user.posts.flatMap((post) => post.media.map((media) => media.url))]) {
    if (isStoredKey(value)) objectKeys.add(value as string);
  }
  for (const row of messageMedia) {
    for (const key of attachmentKeys(row.attachments)) objectKeys.add(key);
  }

  // Object deletion is intentionally first: a transient storage failure leaves
  // the scheduled database account intact so the entire purge can be retried.
  for (const key of objectKeys) await deleteObject(key);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `DELETE FROM messaging.rooms WHERE id IN (SELECT room_id FROM messaging.room_members WHERE user_id = $1) AND kind = 'direct'`,
      userId,
    );
    await tx.$executeRawUnsafe(`DELETE FROM messaging.messages WHERE sender_id = $1`, userId);
    await tx.$executeRawUnsafe(`DELETE FROM messaging.room_members WHERE user_id = $1`, userId);
    await tx.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    await tx.report.deleteMany({ where: { reporterId: userId } });
    await tx.consentRecord.deleteMany({ where: { userId } });
    await tx.idempotencyRecord.deleteMany({ where: { userId } });
    await tx.notificationOutbox.deleteMany({ where: { userId } });
    await tx.authToken.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}

const due = await prisma.user.findMany({
  where: { deletionScheduledAt: { lte: new Date() }, hiddenAt: { not: null } },
  select: { id: true },
  take: 100,
});

let failed = false;
for (const { id } of due) {
  try {
    await purgeUser(id);
    console.info(JSON.stringify({ event: "account_purged", userId: id }));
  } catch (error) {
    failed = true;
    console.error(JSON.stringify({ event: "account_purge_failed", userId: id, error: error instanceof Error ? error.message : "unknown" }));
  }
}

await prisma.$disconnect();
if (failed) process.exitCode = 1;
