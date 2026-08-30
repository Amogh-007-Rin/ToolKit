import { createHash, randomBytes } from "crypto";
import prisma from "@/db";

export type AccountTokenKind = "email_verification" | "password_reset" | "mobile_oauth";

function hash(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function issueAccountToken(userId: string, kind: AccountTokenKind, ttlMs: number) {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, kind, usedAt: null } }),
    prisma.authToken.create({ data: { userId, kind, tokenHash: hash(token), expiresAt: new Date(Date.now() + ttlMs) } }),
  ]);
  return token;
}

export async function consumeAccountToken(token: string, kind: AccountTokenKind) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;
  return prisma.$transaction(async (tx) => {
    const record = await tx.authToken.findUnique({ where: { tokenHash: hash(token) } });
    if (!record || record.kind !== kind || record.usedAt || record.expiresAt <= new Date()) return null;
    const updated = await tx.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    return updated.count === 1 ? record.userId : null;
  });
}
