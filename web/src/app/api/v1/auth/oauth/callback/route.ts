import { NextResponse } from "next/server";
import { finishOAuth } from "@/lib/nativeOAuth";

export async function GET(req: Request) {
  const url = new URL(req.url); const state = url.searchParams.get("state"); const code = url.searchParams.get("code");
  if (!state || !code) return NextResponse.json({ code: "OAUTH_FAILED", message: "Provider denied authorization" }, { status: 400 });
  try { const result = await finishOAuth(state, code, url.origin); const target = new URL(result.redirectUri); target.searchParams.set("code", result.exchangeCode); return NextResponse.redirect(target); }
  catch { return NextResponse.json({ code: "OAUTH_FAILED", message: "OAuth request failed or expired" }, { status: 400 }); }
}
