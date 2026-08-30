export type AppLink =
  | { kind: "profile"; tag: string }
  | { kind: "post"; id: string }
  | { kind: "conversation"; id: string }
  | { kind: "oauthCallback" }
  | { kind: "unknown" };

const SIMPLE_ID = /^[A-Za-z0-9_-]{1,100}$/;

/** Parses only the versioned routes the native app is prepared to navigate to. */
export function parseAppLink(value: string): AppLink {
  try {
    const url = new URL(value);
    if (url.protocol !== "toolkit:" && url.protocol !== "https:") return { kind: "unknown" };
    const parts = [url.protocol === "toolkit:" ? url.hostname : "", ...url.pathname.split("/")]
      .filter(Boolean)
      .map(decodeURIComponent);
    if (parts[0] === "oauth" && parts[1] === "callback") return { kind: "oauthCallback" };
    if (parts.length !== 2 || !SIMPLE_ID.test(parts[1])) return { kind: "unknown" };
    if (parts[0] === "profile") return { kind: "profile", tag: parts[1] };
    if (parts[0] === "posts") return { kind: "post", id: parts[1] };
    if (parts[0] === "conversations") return { kind: "conversation", id: parts[1] };
  } catch {
    // Malformed and double-encoded URLs are intentionally ignored.
  }
  return { kind: "unknown" };
}

export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}
