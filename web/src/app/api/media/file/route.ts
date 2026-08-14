import { NextRequest, NextResponse } from "next/server";
import { getObject, verifyLocalMediaUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const expires = req.nextUrl.searchParams.get("expires") ?? "";
  const signature = req.nextUrl.searchParams.get("signature") ?? "";
  try {
    if (!verifyLocalMediaUrl(key, expires, signature)) {
      return NextResponse.json({ error: "Invalid or expired media URL" }, { status: 403 });
    }
    const object = await getObject(key);
    if (!object.Body) return NextResponse.json({ error: "Media not found" }, { status: 404 });
    return new NextResponse(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
        ...(object.ContentLength ? { "Content-Length": String(object.ContentLength) } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
}
