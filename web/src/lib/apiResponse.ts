import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export function requestId(req: Request): string {
  const supplied = req.headers.get("x-request-id");
  return supplied && /^[A-Za-z0-9._-]{1,100}$/.test(supplied) ? supplied : randomUUID();
}

export function apiJson(req: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "X-Request-ID": requestId(req), "Cache-Control": "no-store" } });
}

export function apiError(req: Request, status: number, code: string, message: string, details?: unknown) {
  return apiJson(req, { code, message, ...(details === undefined ? {} : { details }) }, status);
}
