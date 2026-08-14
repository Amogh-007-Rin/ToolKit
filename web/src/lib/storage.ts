import { randomUUID } from "crypto";
import { createHmac, timingSafeEqual } from "crypto";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;
export const PRESIGN_GET_TTL_SECONDS = 60 * 60 * 24 * 7;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const ALLOWED_KEY_PREFIXES = ["chat/", "posts/", "profile/"];

function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  return bucket;
}

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (s3Client) {
    return s3Client;
  }
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 configuration incomplete (S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)",
    );
  }
  s3Client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "auto",
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
  return s3Client;
}

export function mediaKind(contentType: string): "image" | "video" | null {
  if (IMAGE_TYPES.includes(contentType)) {
    return "image";
  }
  if (VIDEO_TYPES.includes(contentType)) {
    return "video";
  }
  return null;
}

export function validateMedia(contentType: string, size: number): "image" | "video" {
  const kind = mediaKind(contentType);
  if (!kind) {
    throw new Error(`Unsupported file type: ${contentType}`);
  }
  const limit = kind === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (size > limit) {
    throw new Error(`File exceeds the ${Math.round(limit / 1024 / 1024)}MB limit`);
  }
  return kind;
}

export function newObjectKey(prefix: string, contentType: string): string {
  const extension = EXTENSIONS[contentType];
  if (!extension) {
    throw new Error(`Unsupported file type: ${contentType}`);
  }
  return `${prefix}/${randomUUID()}.${extension}`;
}

export function isOwnedObjectKey(key: string, userId: string, scope: "posts" | "profile"): boolean {
  return key.startsWith(`${scope}/${userId}/`);
}

export function assertValidKey(key: string): void {
  if (!key || key.length > 500 || key.includes("\\") || key.includes("..")) {
    throw new Error("invalid object key");
  }
  if (!ALLOWED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    throw new Error("invalid object key prefix");
  }
}

export function isStoredKey(value: string | null | undefined): boolean {
  return typeof value === "string" && ALLOWED_KEY_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export async function resolveStoredUrl(value: string | null): Promise<string | null> {
  if (!isStoredKey(value)) {
    return value;
  }
  try {
    return createLocalMediaUrl(value as string);
  } catch {
    return value;
  }
}

function mediaSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not configured");
  return secret;
}

export function createLocalMediaUrl(key: string, expiresIn = PRESIGN_GET_TTL_SECONDS): string {
  assertValidKey(key);
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const signature = createHmac("sha256", mediaSigningSecret()).update(`${key}:${expires}`).digest("hex");
  const params = new URLSearchParams({ key, expires: String(expires), signature });
  return `/api/media/file?${params.toString()}`;
}

export function verifyLocalMediaUrl(key: string, expires: string, signature: string): boolean {
  assertValidKey(key);
  const expiresAt = Number(expires);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", mediaSigningSecret()).update(`${key}:${expiresAt}`).digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  assertValidKey(key);
  await getClient().send(new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: body, ContentType: contentType, ContentLength: body.length }));
}

export async function getObject(key: string) {
  assertValidKey(key);
  return getClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
}

export async function createPresignedPut(
  key: string,
  contentType: string,
  contentLength: number,
): Promise<{ uploadUrl: string; expiresAt: string }> {
  assertValidKey(key);
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    throw new Error("invalid content length");
  }
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  const expiresIn = 5 * 60;
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn });
  return { uploadUrl, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
}

export async function createPresignedGet(
  key: string,
  expiresIn = PRESIGN_GET_TTL_SECONDS,
): Promise<string> {
  assertValidKey(key);
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(getClient(), command, { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  assertValidKey(key);
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}
