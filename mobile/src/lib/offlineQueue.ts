import * as SQLite from "expo-sqlite";
import { clientId } from "@/lib/ids";
import { retryDelay } from "@/lib/retry";

export type QueueStatus = "pending" | "running" | "failed";
export interface QueuedMutation {
  id: string;
  operation: string;
  path: string;
  method: string;
  body: string | null;
  attempts: number;
  status: QueueStatus;
  error: string | null;
  createdAt: number;
  nextAttemptAt: number;
}

let database: Promise<SQLite.SQLiteDatabase> | null = null;

async function db() {
  if (!database) {
    database = SQLite.openDatabaseAsync("toolkit-mobile.db").then(async (value) => {
      await value.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS mutation_queue (
          id TEXT PRIMARY KEY NOT NULL, operation TEXT NOT NULL, path TEXT NOT NULL,
          method TEXT NOT NULL, body TEXT, attempts INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending', error TEXT,
          created_at INTEGER NOT NULL, next_attempt_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS mutation_queue_ready ON mutation_queue(status, next_attempt_at, created_at);
      `);
      return value;
    });
  }
  return database;
}

export async function enqueueMutation(input: Omit<QueuedMutation, "id" | "attempts" | "status" | "error" | "createdAt" | "nextAttemptAt">) {
  const id = clientId("mutation");
  const now = Date.now();
  await (await db()).runAsync(
    "INSERT INTO mutation_queue (id, operation, path, method, body, created_at, next_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id, input.operation, input.path, input.method, input.body, now, now,
  );
  return id;
}

export async function queuedMutations(): Promise<QueuedMutation[]> {
  return (await db()).getAllAsync<QueuedMutation>(`SELECT id, operation, path, method, body, attempts, status, error,
    created_at AS createdAt, next_attempt_at AS nextAttemptAt FROM mutation_queue ORDER BY created_at`);
}

export async function processMutationQueue(execute: (item: QueuedMutation) => Promise<void>) {
  const store = await db();
  const ready = await store.getAllAsync<QueuedMutation>(`SELECT id, operation, path, method, body, attempts, status, error,
    created_at AS createdAt, next_attempt_at AS nextAttemptAt FROM mutation_queue WHERE status != 'running' AND next_attempt_at <= ? ORDER BY created_at LIMIT 25`, Date.now());
  for (const item of ready) {
    await store.runAsync("UPDATE mutation_queue SET status = 'running' WHERE id = ?", item.id);
    try {
      await execute(item);
      await store.runAsync("DELETE FROM mutation_queue WHERE id = ?", item.id);
    } catch (cause) {
      const attempts = item.attempts + 1;
      const error = cause instanceof Error ? cause.message.slice(0, 500) : "Retry failed";
      await store.runAsync("UPDATE mutation_queue SET status = 'failed', attempts = ?, error = ?, next_attempt_at = ? WHERE id = ?", attempts, error, Date.now() + retryDelay(attempts), item.id);
    }
  }
}

export async function discardMutation(id: string) {
  await (await db()).runAsync("DELETE FROM mutation_queue WHERE id = ?", id);
}

export async function retryMutation(id: string) {
  await (await db()).runAsync("UPDATE mutation_queue SET status = 'pending', error = NULL, next_attempt_at = ? WHERE id = ?", Date.now(), id);
}
