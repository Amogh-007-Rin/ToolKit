import { describe, expect, test } from "bun:test";
import {
  commentCreateSchema,
  postCreateSchema,
  profileUpdateSchema,
  registerSchema,
  toolCreateSchema,
} from "./validation";

describe("request schemas", () => {
  test("normalizes registration email and rejects weak passwords", () => {
    expect(registerSchema.parse({ email: " USER@Example.COM ", password: "123456" }).email)
      .toBe("user@example.com");
    expect(registerSchema.safeParse({ email: "user@example.com", password: "123" }).success)
      .toBe(false);
  });

  test("enforces post and comment limits", () => {
    expect(postCreateSchema.safeParse({ caption: "x", tags: Array(31).fill("tag") }).success)
      .toBe(false);
    expect(commentCreateSchema.safeParse({ content: "   " }).success).toBe(false);
  });

  test("rejects invalid profile tags and logo URLs", () => {
    const profile = { name: "User", bio: "", role: "", location: "", skills: [], tag: "bad tag" };
    expect(profileUpdateSchema.safeParse(profile).success).toBe(false);
    expect(toolCreateSchema.safeParse({ name: "Tool", logoUrl: "javascript:alert(1)" }).success)
      .toBe(false);
  });

  test("enforces profile information limits", () => {
    const profile = { name: "User", bio: "", role: "", location: "", skills: [], tag: null };

    expect(profileUpdateSchema.safeParse({ ...profile, name: "n".repeat(30) }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ ...profile, name: "n".repeat(31) }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ ...profile, role: "r".repeat(31) }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ ...profile, location: "l".repeat(40) }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ ...profile, location: "l".repeat(41) }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ ...profile, skills: Array(6).fill("skill") }).success).toBe(false);
  });
});
