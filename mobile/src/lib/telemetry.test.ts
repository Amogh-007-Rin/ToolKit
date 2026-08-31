import { describe, expect, test } from "bun:test";
import { redactTelemetry } from "./redaction";

describe("telemetry redaction", () => {
  test("removes sensitive fields and nested protected data", () => {
    expect(redactTelemetry({ screen: "settings", accessToken: "secret", nested: { messageContent: "private", count: 2 } })).toEqual({ screen: "settings", accessToken: "[REDACTED]", nested: { messageContent: "[REDACTED]", count: 2 } });
  });
  test("removes URLs and token-like strings", () => {
    expect(redactTelemetry("failed https://private.example/file?sig=abc abcdefghijklmnopqrstuvwxyz123456")).toBe("failed [REDACTED] [REDACTED]");
  });
});
