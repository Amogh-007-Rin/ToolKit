import { config } from "@/lib/config";
import type { NativeAuthPayload } from "@/store/session";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

interface AuthErrorBody {
  code?: string;
  message?: string;
}

async function authRequest<T = NativeAuthPayload>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(`${config.apiUrl}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Name": "ToolKit mobile" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as AuthErrorBody;
    throw new Error(error.message ?? "Authentication failed");
  }
  return response.json() as Promise<T>;
}

export function signIn(email: string, password: string) {
  return authRequest("login", { email, password });
}

export function register(name: string, email: string, password: string) {
  return authRequest<NativeAuthPayload | { verificationRequired: true; email: string }>("register", { name, email, password });
}

export function resendVerification(email: string) {
  return authRequest<{ accepted: true }>("resend-verification", { email });
}

export function forgotPassword(email: string) {
  return authRequest<{ accepted: true }>("forgot-password", { email });
}

export type OAuthProvider = "google" | "github" | "linkedin" | "discord";
export async function signInWithOAuth(provider: OAuthProvider): Promise<NativeAuthPayload> {
  const redirectUri = makeRedirectUri({ scheme: "toolkit", path: "oauth/callback" });
  const start = await authRequest<{ authorizationUrl: string }>("oauth/start", { provider, redirectUri });
  const result = await WebBrowser.openAuthSessionAsync(start.authorizationUrl, redirectUri);
  if (result.type !== "success") throw new Error(result.type === "cancel" ? "OAuth sign-in cancelled" : "OAuth sign-in failed");
  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new Error("OAuth provider did not return an exchange code");
  return authRequest<NativeAuthPayload>("oauth/exchange", { code });
}
