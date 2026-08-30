export function retryDelay(attempt: number): number {
  return Math.min(60_000, 1000 * 2 ** Math.min(Math.max(attempt, 0), 6));
}
