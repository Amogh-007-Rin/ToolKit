import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { jwtVerify, SignJWT } from "jose";
import prisma from "@/db";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_ISSUER = "toolkit-web";
const TOKEN_AUDIENCE = "toolkit-api";

export interface NativeAuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  tag: string | null;
}

interface DeviceInfo {
  deviceName?: string;
  userAgent?: string;
}

function signingKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

function refreshHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newRefreshToken(sessionId: string): string {
  return `${sessionId}.${randomBytes(48).toString("base64url")}`;
}

function refreshSessionId(token: string): string | null {
  const separator = token.indexOf(".");
  if (separator <= 0 || separator > 100) return null;
  return token.slice(0, separator);
}

function hashesMatch(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

async function accessToken(user: NativeAuthUser): Promise<string> {
  return new SignJWT({ id: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .setJti(randomUUID())
    .sign(signingKey());
}

export async function createNativeSession(user: NativeAuthUser, device: DeviceInfo) {
  const sessionId = randomUUID();
  const refreshToken = newRefreshToken(sessionId);
  await prisma.nativeSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: refreshHash(refreshToken),
      familyId: randomUUID(),
      deviceName: device.deviceName?.slice(0, 120) || null,
      userAgent: device.userAgent?.slice(0, 500) || null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return {
    accessToken: await accessToken(user),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user,
  };
}

export async function rotateNativeSession(refreshToken: string) {
  const sessionId = refreshSessionId(refreshToken);
  if (!sessionId) return null;
  const tokenHash = refreshHash(refreshToken);
  const nextRefreshToken = newRefreshToken(sessionId);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.nativeSession.findUnique({
      where: { id: sessionId },
      include: { user: { select: { id: true, email: true, name: true, image: true, tag: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= now) return null;
    if (!hashesMatch(session.refreshTokenHash, tokenHash)) {
      await tx.nativeSession.updateMany({ where: { familyId: session.familyId }, data: { revokedAt: now } });
      return null;
    }

    const updated = await tx.nativeSession.updateMany({
      where: { id: session.id, refreshTokenHash: tokenHash, revokedAt: null },
      data: {
        refreshTokenHash: refreshHash(nextRefreshToken),
        lastUsedAt: now,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    if (updated.count !== 1) {
      await tx.nativeSession.updateMany({ where: { familyId: session.familyId }, data: { revokedAt: now } });
      return null;
    }
    return session.user;
  });

  if (!result) return null;
  return {
    accessToken: await accessToken(result),
    refreshToken: nextRefreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: result,
  };
}

export async function revokeNativeSession(refreshToken: string): Promise<void> {
  const sessionId = refreshSessionId(refreshToken);
  if (!sessionId) return;
  await prisma.nativeSession.updateMany({
    where: { id: sessionId, refreshTokenHash: refreshHash(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllNativeSessions(userId: string): Promise<number> {
  const result = await prisma.nativeSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function listNativeSessions(userId: string) {
  return prisma.nativeSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, deviceName: true, userAgent: true, createdAt: true, lastUsedAt: true, expiresAt: true },
    orderBy: { lastUsedAt: "desc" },
  });
}

export async function createRealtimeTicket(userId: string): Promise<string> {
  return new SignJWT({ scope: "realtime:connect" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(TOKEN_ISSUER)
    .setAudience("toolkit-realtime")
    .setIssuedAt()
    .setExpirationTime("60s")
    .setJti(randomUUID())
    .sign(signingKey());
}

export async function verifyNativeAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    return typeof payload.sub === "string" && payload.sub.length <= 100 ? payload.sub : null;
  } catch {
    return null;
  }
}
