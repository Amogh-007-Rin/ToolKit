import { useEffect, useState } from "react";

export interface Attachment {
  key: string;
  kind: "image" | "video";
  name?: string | null;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const CACHE_TTL_MS = 60 * 60 * 1000;
const REFRESH_BEFORE_MS = 60_000;

const cache = new Map<string, { url: string; expiresAt: number }>();

export type UploadScope = "chat" | "post" | "profile" | "banner";

async function putToPresignedUrl(
  uploadUrl: string,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("upload failed"));
    xhr.send(file);
  });
}

export async function uploadFile(
  file: File,
  scope: UploadScope,
  onProgress: (fraction: number) => void,
): Promise<{ key: string; kind: "image" | "video" }> {
  const presignRes = await fetch("/api/media/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope,
      contentType: file.type,
      size: file.size,
    }),
  });
  if (!presignRes.ok) {
    throw new Error("presign failed");
  }
  const { key, kind, uploadUrl } = (await presignRes.json()) as {
    key: string;
    kind: "image" | "video";
    uploadUrl: string;
  };
  await putToPresignedUrl(uploadUrl, file, onProgress);
  return { key, kind };
}

export async function resolveMediaUrl(key: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now() + REFRESH_BEFORE_MS) {
    return cached.url;
  }
  const res = await fetch(`/api/media/url?key=${encodeURIComponent(key)}`);
  if (!res.ok) {
    throw new Error("media unavailable");
  }
  const body = (await res.json()) as { url: string };
  cache.set(key, { url: body.url, expiresAt: Date.now() + CACHE_TTL_MS });
  return body.url;
}

export function useMediaUrl(key: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!key) {
        return;
      }
      try {
        const resolved = await resolveMediaUrl(key);
        if (!cancelled) {
          setUrl(resolved);
        }
      } catch {
        if (!cancelled) {
          setUrl(null);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return url;
}

export async function uploadChatMedia(
  file: File,
  roomId: string,
  onProgress: (fraction: number) => void,
): Promise<Attachment> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("file too large");
  }
  const kind: Attachment["kind"] = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : (() => {
          throw new Error("unsupported file type");
        })();

  const presignRes = await fetch("/api/media/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: "chat",
      roomId,
      contentType: file.type,
      size: file.size,
    }),
  });
  if (!presignRes.ok) {
    throw new Error("presign failed");
  }
  const { key, uploadUrl } = (await presignRes.json()) as {
    key: string;
    uploadUrl: string;
  };

  await putToPresignedUrl(uploadUrl, file, onProgress);

  return { key, kind, name: file.name || null };
}
