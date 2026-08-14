interface WindowEntry {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, WindowEntry>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxEntries = 10_000,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
      if (this.entries.size >= this.maxEntries) {
        this.prune(now);
      }
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (current.count >= this.limit) {
      return false;
    }
    current.count += 1;
    return true;
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now || this.entries.size >= this.maxEntries) {
        this.entries.delete(key);
      }
      if (this.entries.size < this.maxEntries) break;
    }
  }
}

export function requestClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}
