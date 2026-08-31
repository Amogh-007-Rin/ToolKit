const URL_PATTERN = /https?:\/\/|www\./gi;
const REPEATED_CHARACTER = /(.)\1{11,}/iu;

export interface ContentPolicyResult {
  allowed: boolean;
  code?: "CONTENT_BLOCKED" | "SPAM_DETECTED";
  message?: string;
}

function blockedTerms(): string[] {
  return (process.env.CONTENT_BLOCKED_TERMS ?? "").split(",").map((term) => term.trim().toLocaleLowerCase()).filter((term) => term.length >= 2).slice(0, 500);
}

/** Local-only configurable policy; content is never sent to a moderation vendor. */
export function checkContentPolicy(value: string): ContentPolicyResult {
  const normalized = value.normalize("NFKC").toLocaleLowerCase();
  for (const term of blockedTerms()) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, "iu").test(normalized)) return { allowed: false, code: "CONTENT_BLOCKED", message: "Content contains a term prohibited by the community policy" };
  }
  const links = normalized.match(URL_PATTERN)?.length ?? 0;
  if (links > Number(process.env.CONTENT_MAX_LINKS ?? 4) || REPEATED_CHARACTER.test(normalized)) return { allowed: false, code: "SPAM_DETECTED", message: "Content appears to be repetitive or contain too many links" };
  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length >= 12 && new Set(words).size / words.length < 0.25) return { allowed: false, code: "SPAM_DETECTED", message: "Content appears excessively repetitive" };
  return { allowed: true };
}
