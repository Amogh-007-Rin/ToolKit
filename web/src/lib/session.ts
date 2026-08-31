import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { NEXT_AUTH_CONFIG } from "@/lib/authConfig";
import { verifyNativeAccessToken } from "@/lib/mobileAuth";

export async function getSessionUserId(): Promise<string | null> {
    return activeUserId(await getAuthenticatedUserId());
}

export async function getAuthenticatedUserId(): Promise<string | null> {
    const authorization = (await headers()).get("authorization");
    if (authorization) {
        const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!token) return null;
        return verifyNativeAccessToken(token);
    }
    const session = await getServerSession(NEXT_AUTH_CONFIG);
    return session?.user?.id ?? null;
}

async function activeUserId(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const { default: prisma } = await import("@/db");
    const user = await prisma.user.findFirst({
        where: { id: userId, hiddenAt: null, suspendedAt: null },
        select: { id: true },
    });
    return user?.id ?? null;
}
