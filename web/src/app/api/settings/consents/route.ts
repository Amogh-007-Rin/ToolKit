import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

const DOCUMENTS = new Set(["terms", "privacy", "analytics_opt_in", "analytics_opt_out"]);

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ code: "AUTH_EXPIRED", error: "Unauthorized" }, { status: 401 });
  const consents = await prisma.consentRecord.findMany({ where: { userId }, select: { document: true, version: true, acceptedAt: true }, orderBy: { acceptedAt: "desc" } });
  return NextResponse.json({ consents });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ code: "AUTH_EXPIRED", error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { document?: unknown; version?: unknown } | null;
  if (!body || typeof body.document !== "string" || !DOCUMENTS.has(body.document) || typeof body.version !== "string" || !/^\d{4}-\d{2}-\d{2}(?:\.\d+)?$/.test(body.version)) return NextResponse.json({ code: "VALIDATION_FAILED", error: "Invalid consent record" }, { status: 400 });
  const consent = await prisma.consentRecord.upsert({ where: { userId_document_version: { userId, document: body.document, version: body.version } }, create: { userId, document: body.document, version: body.version }, update: {} });
  return NextResponse.json({ consent }, { status: 201 });
}
