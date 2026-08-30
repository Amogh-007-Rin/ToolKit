import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { NEXT_AUTH_CONFIG } from "@/lib/authConfig";
import { verifyNativeAccessToken } from "@/lib/mobileAuth";

export async function getSessionUserId(): Promise<string | null> {
    const authorization = (await headers()).get("authorization");
    if (authorization) {
        const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
        return token ? verifyNativeAccessToken(token) : null;
    }
    const session = await getServerSession(NEXT_AUTH_CONFIG);
    return session?.user?.id ?? null;
}
