import { describe, expect, test } from "bun:test";
import { FixedWindowRateLimiter, requestClientKey } from "./rateLimit";

describe("FixedWindowRateLimiter", () => {
  test("limits a key and resets after the window", () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000);
    expect(limiter.allow("user", 100)).toBe(true);
    expect(limiter.allow("user", 200)).toBe(true);
    expect(limiter.allow("user", 300)).toBe(false);
    expect(limiter.allow("user", 1_100)).toBe(true);
  });

  test("tracks keys independently", () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("b", 0)).toBe(true);
    expect(limiter.allow("a", 1)).toBe(false);
  });

  test("resets a key after a successful operation", () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000);
    expect(limiter.allow("user", 0)).toBe(true);
    expect(limiter.allow("user", 1)).toBe(false);
    limiter.reset("user");
    expect(limiter.allow("user", 2)).toBe(true);
  });
});

test("requestClientKey selects the first forwarded address", () => {
  const req = new Request("https://example.test", {
    headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
  });
  expect(requestClientKey(req)).toBe("203.0.113.5");
});
