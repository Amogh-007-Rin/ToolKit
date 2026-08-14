import { describe, expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  test("round-trips the correct password and rejects another", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(stored).not.toContain("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  test("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("password", "not-a-hash")).toBe(false);
  });
});
