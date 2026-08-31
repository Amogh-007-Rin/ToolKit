import { GET, POST as legacyPost } from "@/app/api/ai-search/chats/route";
import { idempotent } from "@/lib/idempotency";

export { GET };
export const POST = idempotent("ai.chats.create", legacyPost);
