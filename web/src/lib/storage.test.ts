import { describe, expect, test } from "bun:test";
import {
  assertValidKey,
  isOwnedObjectKey,
  mediaKind,
  newObjectKey,
  validateMedia,
} from "./storage";

describe("storage validation", () => {
  test("accepts supported media at its size boundary", () => {
    expect(mediaKind("image/webp")).toBe("image");
    expect(validateMedia("image/png", 10 * 1024 * 1024)).toBe("image");
    expect(() => validateMedia("image/png", 10 * 1024 * 1024 + 1)).toThrow();
    expect(() => validateMedia("text/html", 10)).toThrow();
  });

  test("creates scoped keys and rejects traversal", () => {
    const key = newObjectKey("posts/user-1", "image/jpeg");
    expect(key).toMatch(/^posts\/user-1\/[0-9a-f-]+\.jpg$/);
    expect(() => assertValidKey(key)).not.toThrow();
    expect(() => assertValidKey("posts/../private")).toThrow();
  });

  test("enforces per-user object ownership", () => {
    expect(isOwnedObjectKey("posts/user-1/file.jpg", "user-1", "posts")).toBe(true);
    expect(isOwnedObjectKey("posts/user-10/file.jpg", "user-1", "posts")).toBe(false);
    expect(isOwnedObjectKey("posts/user-2/file.jpg", "user-1", "posts")).toBe(false);
  });
});
