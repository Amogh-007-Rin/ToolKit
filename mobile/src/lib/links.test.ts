import { describe, expect, test } from "bun:test";
import { isSafeExternalUrl, parseAppLink } from "./links";
import { retryDelay } from "./retry";

describe("mobile link contract", () => {
  test("parses supported custom and universal links", () => {
    expect(parseAppLink("toolkit://profile/alice")).toEqual({ kind: "profile", tag: "alice" });
    expect(parseAppLink("https://toolkit.example/posts/post_12")).toEqual({ kind: "post", id: "post_12" });
    expect(parseAppLink("toolkit://oauth/callback?code=secret")).toEqual({ kind: "oauthCallback" });
    expect(parseAppLink("toolkit://conversations/room_12")).toEqual({ kind: "conversation", id: "room_12" });
    expect(parseAppLink("toolkit://notifications/notice_1")).toEqual({ kind: "notification", id: "notice_1" });
    expect(parseAppLink("https://toolkit.example/reset-password?token=reset_1")).toEqual({ kind: "resetPassword", token: "reset_1" });
    expect(parseAppLink("toolkit://account/restore")).toEqual({ kind: "restoreAccount" });
  });

  test("rejects unknown, malformed, and unsafe links", () => {
    expect(parseAppLink("javascript:alert(1)")).toEqual({ kind: "unknown" });
    expect(parseAppLink("toolkit://posts/a/b")).toEqual({ kind: "unknown" });
    expect(isSafeExternalUrl("https://example.com/tool")).toBe(true);
    expect(isSafeExternalUrl("file:///private/token")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
  });

  test("bounds offline retry backoff", () => {
    expect(retryDelay(0)).toBe(1000);
    expect(retryDelay(3)).toBe(8000);
    expect(retryDelay(20)).toBe(60000);
  });
});
