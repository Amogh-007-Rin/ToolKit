import { NextRequest, NextResponse } from "next/server";

const REQUEST_ID = /^[A-Za-z0-9._-]{1,100}$/;

export function proxy(request: NextRequest) {
  const supplied = request.headers.get("x-request-id");
  const requestId = supplied && REQUEST_ID.test(supplied) ? supplied : crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Request-ID", requestId);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: "/api/v1/:path*",
};
