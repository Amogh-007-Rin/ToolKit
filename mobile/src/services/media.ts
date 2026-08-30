import { config } from "@/lib/config";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";

export interface LocalMedia { uri: string; mimeType: string; size: number; name?: string }
export interface UploadedMedia { key: string; kind: "image" | "video" }

export async function uploadMedia(file: LocalMedia, scope: "post" | "chat" | "profile" | "banner", onProgress: (value: number) => void, roomId?: string, signal?: AbortSignal): Promise<UploadedMedia> {
  const presigned = await api<{ key: string; kind: "image" | "video"; uploadUrl: string }>("/media/presign", { method: "POST", body: JSON.stringify({ scope, roomId, contentType: file.mimeType, size: file.size }) });
  const blob = await fetch(file.uri).then((response) => response.blob());
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open("PUT", new URL(presigned.uploadUrl, config.serverUrl).toString()); xhr.setRequestHeader("Content-Type", file.mimeType); const token = useSessionStore.getState().accessToken; if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(event.loaded / event.total); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)); xhr.onerror = () => reject(new Error("Upload failed")); xhr.onabort = () => reject(new Error("Upload cancelled"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true }); xhr.send(blob);
  });
  return { key: presigned.key, kind: presigned.kind };
}
