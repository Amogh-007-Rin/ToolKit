import { getServerSession } from "next-auth";
import { NEXT_AUTH_CONFIG } from "@/lib/authConfig";

export async function getSessionUserId(): Promise<string | null> {
    const session = await getServerSession(NEXT_AUTH_CONFIG);
    return session?.user?.id ?? null;
}
