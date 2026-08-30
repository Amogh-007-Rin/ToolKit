import { createHash, randomBytes } from "crypto";
import prisma from "@/db";
import { issueAccountToken } from "@/lib/accountTokens";

export const providers = ["google", "github", "linkedin", "discord"] as const;
export type OAuthProvider = typeof providers[number];
const callbackPath = "/api/v1/auth/oauth/callback";
const hash = (value: string) => createHash("sha256").update(value).digest("base64url");

const configs: Record<OAuthProvider, { authorize: string; token: string; scope: string; clientId: string; clientSecret: string }> = {
  google: { authorize: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scope: "openid email profile", clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" },
  github: { authorize: "https://github.com/login/oauth/authorize", token: "https://github.com/login/oauth/access_token", scope: "read:user user:email", clientId: process.env.GITHUB_ID ?? "", clientSecret: process.env.GITHUB_SECRET ?? "" },
  linkedin: { authorize: "https://www.linkedin.com/oauth/v2/authorization", token: "https://www.linkedin.com/oauth/v2/accessToken", scope: "openid profile email", clientId: process.env.LINKEDIN_CLIENT_ID ?? "", clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "" },
  discord: { authorize: "https://discord.com/oauth2/authorize", token: "https://discord.com/api/oauth2/token", scope: "identify email", clientId: process.env.DISCORD_CLIENT_ID ?? "", clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "" },
};

export function safeNativeRedirect(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "toolkit:" && url.hostname === "oauth" && url.pathname === "/callback" && !url.username && !url.password; } catch { return false; }
}

export async function beginOAuth(provider: OAuthProvider, redirectUri: string, origin: string) {
  const config = configs[provider];
  if (!config.clientId || !config.clientSecret) throw new Error(`${provider} OAuth is not configured`);
  const state = randomBytes(32).toString("base64url"); const verifier = randomBytes(48).toString("base64url");
  await prisma.oAuthAttempt.create({ data: { stateHash: hash(state), provider, redirectUri, verifier, expiresAt: new Date(Date.now() + 10 * 60_000) } });
  const callback = new URL(callbackPath, origin).toString();
  const url = new URL(config.authorize); url.searchParams.set("client_id", config.clientId); url.searchParams.set("redirect_uri", callback); url.searchParams.set("response_type", "code"); url.searchParams.set("scope", config.scope); url.searchParams.set("state", state); url.searchParams.set("code_challenge", hash(verifier)); url.searchParams.set("code_challenge_method", "S256");
  if (provider === "google") url.searchParams.set("access_type", "offline");
  return url;
}

async function profile(provider: OAuthProvider, accessToken: string): Promise<{ accountId: string; email: string; name: string | null; image: string | null }> {
  const auth = { Authorization: `Bearer ${accessToken}`, Accept: "application/json", "User-Agent": "ToolKit-Mobile-OAuth" };
  if (provider === "github") {
    const user = await fetch("https://api.github.com/user", { headers: auth }).then((r) => r.json()) as { id: number; name?: string; login?: string; avatar_url?: string; email?: string };
    let email = user.email; if (!email) { const emails = await fetch("https://api.github.com/user/emails", { headers: auth }).then((r) => r.json()) as Array<{ email: string; primary: boolean; verified: boolean }>; email = emails.find((e) => e.primary && e.verified)?.email; }
    if (!email) throw new Error("Provider did not return a verified email"); return { accountId: String(user.id), email, name: user.name ?? user.login ?? null, image: user.avatar_url ?? null };
  }
  const endpoint = provider === "google" ? "https://openidconnect.googleapis.com/v1/userinfo" : provider === "linkedin" ? "https://api.linkedin.com/v2/userinfo" : "https://discord.com/api/users/@me";
  const user = await fetch(endpoint, { headers: auth }).then((r) => r.json()) as Record<string, unknown>;
  const accountId = String(user.sub ?? user.id ?? ""); const email = typeof user.email === "string" ? user.email : "";
  if (!accountId || !email || user.email_verified === false || user.verified === false) throw new Error("Provider did not return a verified email");
  const image = typeof user.picture === "string" ? user.picture : provider === "discord" && typeof user.avatar === "string" ? `https://cdn.discordapp.com/avatars/${accountId}/${user.avatar}.png` : null;
  return { accountId, email: email.toLowerCase(), name: typeof user.name === "string" ? user.name : typeof user.username === "string" ? user.username : null, image };
}

export async function finishOAuth(state: string, code: string, origin: string) {
  const attempt = await prisma.oAuthAttempt.findUnique({ where: { stateHash: hash(state) } });
  if (!attempt || attempt.usedAt || attempt.expiresAt <= new Date() || !providers.includes(attempt.provider as OAuthProvider)) throw new Error("OAuth request is invalid or expired");
  const claimed = await prisma.oAuthAttempt.updateMany({ where: { id: attempt.id, usedAt: null }, data: { usedAt: new Date() } }); if (claimed.count !== 1) throw new Error("OAuth request was already used");
  const provider = attempt.provider as OAuthProvider; const config = configs[provider]; const callback = new URL(callbackPath, origin).toString();
  const params = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callback, client_id: config.clientId, client_secret: config.clientSecret, code_verifier: attempt.verifier });
  const response = await fetch(config.token, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: params }); const tokens = await response.json() as { access_token?: string };
  if (!response.ok || !tokens.access_token) throw new Error("Provider rejected OAuth exchange");
  const external = await profile(provider, tokens.access_token);
  const existingAccount = await prisma.account.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId: external.accountId } }, include: { user: true } });
  const user = existingAccount?.user ?? await prisma.$transaction(async (tx) => {
    let local = await tx.user.findUnique({ where: { email: external.email } });
    if (!local) local = await tx.user.create({ data: { email: external.email, name: external.name, image: external.image, emailVerified: new Date() } });
    await tx.account.upsert({ where: { provider_providerAccountId: { provider, providerAccountId: external.accountId } }, create: { userId: local.id, type: "oauth", provider, providerAccountId: external.accountId }, update: { userId: local.id } }); return local;
  });
  const exchangeCode = await issueAccountToken(user.id, "mobile_oauth", 2 * 60_000);
  return { redirectUri: attempt.redirectUri, exchangeCode };
}
