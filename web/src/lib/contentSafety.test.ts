import { afterEach, describe, expect, test } from "bun:test";
import { checkContentPolicy } from "./contentSafety";

const originalTerms = process.env.CONTENT_BLOCKED_TERMS;
afterEach(() => { if (originalTerms === undefined) delete process.env.CONTENT_BLOCKED_TERMS; else process.env.CONTENT_BLOCKED_TERMS = originalTerms; });

describe("local content safety policy", () => {
  test("accepts ordinary product content", () => expect(checkContentPolicy("A useful collection of design and coding tools").allowed).toBe(true));
  test("uses configurable whole-word blocked terms", () => { process.env.CONTENT_BLOCKED_TERMS = "forbidden phrase,badword"; expect(checkContentPolicy("This has a forbidden phrase.").code).toBe("CONTENT_BLOCKED"); expect(checkContentPolicy("badwording is different").allowed).toBe(true); });
  test("rejects link and repetition spam", () => { expect(checkContentPolicy("https://a.dev https://b.dev https://c.dev https://d.dev https://e.dev").code).toBe("SPAM_DETECTED"); expect(checkContentPolicy("aaaaaaaaaaaa").code).toBe("SPAM_DETECTED"); });
});
