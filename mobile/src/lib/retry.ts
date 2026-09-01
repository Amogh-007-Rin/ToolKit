export function retryDelay(attempt: number): number {
  return Math.min(60_000, 1000 * 2 ** Math.min(Math.max(attempt, 0), 6));
}

export function isRetryableMutationError(error: { status: number; code: string }) {
  return error.status === 408
    || error.status === 425
    || error.status === 429
    || error.status >= 500
    || error.code === "OFFLINE_RETRYABLE";
}

export const RETRYABLE_OPERATIONS = [
  "collections.create", "collections.update", "collections.showcase", "collections.import",
  "tools.create", "tools.update", "posts.like.toggle", "posts.save.toggle", "posts.create",
  "posts.update", "comments.create", "notifications.read-all", "notifications.read",
  "preferences.notifications", "preferences.privacy", "consent.record", "profile.update",
  "users.follow.toggle",
] as const;

export type RetryableOperation = typeof RETRYABLE_OPERATIONS[number];
