import { afterEach, expect, test } from "bun:test";
import { createDirectRoom, getRealtimeTicket, listRooms, MESSAGE_SERVICE_URL } from "./messaging";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("direct room creation and room loading use REST credentials", async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url === "/api/messages/token") return Response.json({ token: "session-jwe" });
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer session-jwe");
    if (url.endsWith("/rooms/direct")) {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual({ userId: "visitor" });
      return Response.json({ room: { id: "direct-room" } });
    }
    return Response.json({ rooms: [{ id: "direct-room" }] });
  }) as typeof fetch;

  expect((await createDirectRoom("visitor")).room.id).toBe("direct-room");
  expect((await listRooms()).rooms[0].id).toBe("direct-room");
  expect(calls).toEqual([
    "/api/messages/token", `${MESSAGE_SERVICE_URL}/rooms/direct`,
    "/api/messages/token", `${MESSAGE_SERVICE_URL}/rooms`,
  ]);
});

test("each realtime connection requests a fresh one-use ticket", async () => {
  let issued = 0;
  globalThis.fetch = (async (input, init) => {
    expect(String(input)).toBe("/api/v1/realtime/ticket");
    expect(init?.method).toBe("POST");
    expect(init?.cache).toBe("no-store");
    return Response.json({ ticket: `ticket-${++issued}` });
  }) as typeof fetch;

  expect(await getRealtimeTicket()).toBe("ticket-1");
  expect(await getRealtimeTicket()).toBe("ticket-2");
});
