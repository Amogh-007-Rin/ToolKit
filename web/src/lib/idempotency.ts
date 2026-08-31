import { createHash } from "crypto";
import prisma from "@/db";
import { Prisma } from "../../generated/prisma/client";
import { apiError, apiJson } from "@/lib/apiResponse";

const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const RECORD_TTL_MS = 24 * 60 * 60_000;

type RouteHandler<Context = unknown> = (req: Request, context: Context) => Promise<Response>;

function requestHash(req: Request, body: string) {
  return createHash("sha256")
    .update(req.method)
    .update("\0")
    .update(new URL(req.url).pathname)
    .update("\0")
    .update(body)
    .digest("hex");
}

/**
 * Persistently claims a mobile mutation before executing it. The claim prevents
 * concurrent processes and later offline retries from applying the same action
 * more than once. Web callers without an Idempotency-Key remain compatible.
 */
export function idempotent<Context>(operation: string, handler: RouteHandler<Context>): RouteHandler<Context> {
  return async (req, context) => {
    const userId = await import("@/lib/session").then(({ getSessionUserId }) => getSessionUserId());
    if (!userId) return apiError(req, 401, "AUTH_EXPIRED", "Authentication required");

    const key = req.headers.get("idempotency-key");
    if (!key) return handler(req, context);
    if (!KEY_PATTERN.test(key)) return apiError(req, 400, "VALIDATION_FAILED", "Invalid Idempotency-Key");

    const body = await req.clone().text();
    const hash = requestHash(req, body);
    const unique = { userId_key_operation: { userId, key, operation } };

    try {
      await prisma.idempotencyRecord.create({
        data: {
          userId,
          key,
          operation,
          requestHash: hash,
          statusCode: 0,
          response: {},
          expiresAt: new Date(Date.now() + RECORD_TTL_MS),
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const existing = await prisma.idempotencyRecord.findUnique({ where: unique });
      if (!existing || existing.expiresAt <= new Date()) {
        if (existing) await prisma.idempotencyRecord.delete({ where: unique });
        return idempotent(operation, handler)(req, context);
      }
      if (existing.requestHash !== hash) {
        return apiError(req, 409, "IDEMPOTENCY_CONFLICT", "Idempotency key was reused for a different request");
      }
      if (existing.statusCode === 0) {
        return apiError(req, 409, "IDEMPOTENCY_IN_PROGRESS", "The original request is still processing");
      }
      return apiJson(req, existing.response, existing.statusCode);
    }

    try {
      const response = await handler(req, context);
      const responseBody = await response.clone().json().catch(() => null);
      if (responseBody !== null) {
        await prisma.idempotencyRecord.update({
          where: unique,
          data: { statusCode: response.status, response: responseBody as Prisma.InputJsonValue },
        });
      } else {
        await prisma.idempotencyRecord.delete({ where: unique });
      }
      response.headers.set("Idempotency-Key", key);
      return response;
    } catch (error) {
      await prisma.idempotencyRecord.deleteMany({ where: { userId, key, operation, statusCode: 0 } });
      throw error;
    }
  };
}
