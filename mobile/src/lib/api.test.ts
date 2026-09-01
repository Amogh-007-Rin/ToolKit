import { describe, expect, test } from "bun:test";
import { isRetryableMutationError, RETRYABLE_OPERATIONS } from "@/lib/retry";

describe("queued mutation retry policy", () => {
  test("retains transient failures", () => {
    expect(isRetryableMutationError({ status: 408, code: "REQUEST_FAILED" })).toBe(true);
    expect(isRetryableMutationError({ status: 429, code: "RATE_LIMITED" })).toBe(true);
    expect(isRetryableMutationError({ status: 503, code: "REQUEST_FAILED" })).toBe(true);
    expect(isRetryableMutationError({ status: 409, code: "OFFLINE_RETRYABLE" })).toBe(true);
  });

  test("discards permanent client failures", () => {
    expect(isRetryableMutationError({ status: 400, code: "VALIDATION_FAILED" })).toBe(false);
    expect(isRetryableMutationError({ status: 401, code: "AUTH_EXPIRED" })).toBe(false);
    expect(isRetryableMutationError({ status: 403, code: "BLOCKED" })).toBe(false);
    expect(isRetryableMutationError({ status: 409, code: "CONFLICT" })).toBe(false);
  });

  test("keeps destructive and security operations online-only", () => {
    const operations: readonly string[] = RETRYABLE_OPERATIONS;
    expect(operations.includes("posts.delete")).toBe(false);
    expect(operations.includes("comments.delete")).toBe(false);
    expect(operations.includes("account.delete")).toBe(false);
    expect(operations.includes("account.restore")).toBe(false);
    expect(operations.includes("password.change")).toBe(false);
    expect(operations.includes("moderation.action")).toBe(false);
  });
});
