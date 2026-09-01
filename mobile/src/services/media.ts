import { config } from "@/lib/config";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";
import * as FileSystem from "expo-file-system/legacy";
import { clientId } from "@/lib/ids";
import { discardMutation, enqueueMutation, failMutation, QueuedMutation } from "@/lib/offlineQueue";
import type { OperationResult } from "@/generated/contract-types";

export interface LocalMedia { uri: string; mimeType: string; size: number; name?: string }
export interface UploadedMedia { key: string; kind: "image" | "video" }

export async function persistMediaForRetry(file: LocalMedia): Promise<LocalMedia> {
  if (!FileSystem.documentDirectory) throw new Error("Persistent app storage is unavailable");
  const extension = file.name?.match(/\.[a-z0-9]+$/i)?.[0] ?? (file.mimeType.startsWith("video/") ? ".mp4" : ".jpg");
  const directory = `${FileSystem.documentDirectory}queued-media/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const uri = `${directory}${clientId("media")}${extension}`;
  await FileSystem.copyAsync({ from: file.uri, to: uri });
  return { ...file, uri };
}

export async function removePersistedMedia(files: LocalMedia[]) {
  await Promise.all(files.map((file) => file.uri.includes("/queued-media/") ? FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(() => undefined) : undefined));
}

interface QueuedPostMediaPayload { files: LocalMedia[]; caption: string; tags: string[] }

export async function executeQueuedMediaMutation(item: QueuedMutation) {
  if (item.operation !== "media.post.create" || !item.body) throw new Error("Unsupported queued media operation");
  const payload = JSON.parse(item.body) as QueuedPostMediaPayload;
  const uploaded = [];
  for (let index = 0; index < payload.files.length; index += 1) {
    const media = await uploadMedia(payload.files[index], "post", () => undefined);
    uploaded.push({ key: media.key, type: media.kind, order: index });
  }
  await api("/posts", { method: "POST", headers: { "Idempotency-Key": item.id }, body: JSON.stringify({ caption: payload.caption, tags: payload.tags, media: uploaded }) });
  await removePersistedMedia(payload.files);
}

export async function createPostWithQueuedMedia(files: LocalMedia[], caption: string, tags: string[], onPersist?: (value: number) => void) {
  const persisted: LocalMedia[] = [];
  try {
    for (let index = 0; index < files.length; index += 1) { persisted.push(await persistMediaForRetry(files[index])); onPersist?.((index + 1) / files.length); }
    const body = JSON.stringify({ files: persisted, caption, tags } satisfies QueuedPostMediaPayload);
    const id = await enqueueMutation({ operation: "media.post.create", path: "/posts", method: "POST", body });
    const item: QueuedMutation = { id, operation: "media.post.create", path: "/posts", method: "POST", body, attempts: 0, status: "pending", error: null, createdAt: Date.now(), nextAttemptAt: Date.now() };
    try { await executeQueuedMediaMutation(item); await discardMutation(id); return { queued: false as const }; }
    catch (cause) { await failMutation(id, cause instanceof Error ? cause.message : "Media upload waiting for connectivity"); return { queued: true as const }; }
  } catch (cause) { await removePersistedMedia(persisted); throw cause; }
}

export async function uploadMedia(file: LocalMedia, scope: "post" | "chat" | "profile" | "banner", onProgress: (value: number) => void, roomId?: string, signal?: AbortSignal): Promise<UploadedMedia> {
  const presigned = await api<OperationResult<"presignMediaUpload", { key: string; kind: "image" | "video"; uploadUrl: string }>>("/media/presign", { method: "POST", body: JSON.stringify({ scope, roomId, contentType: file.mimeType, size: file.size }) });
  const blob = await fetch(file.uri).then((response) => response.blob());
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open("PUT", new URL(presigned.uploadUrl, config.serverUrl).toString()); xhr.setRequestHeader("Content-Type", file.mimeType); const token = useSessionStore.getState().accessToken; if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(event.loaded / event.total); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)); xhr.onerror = () => reject(new Error("Upload failed")); xhr.onabort = () => reject(new Error("Upload cancelled"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true }); xhr.send(blob);
  });
  return { key: presigned.key, kind: presigned.kind };
}
