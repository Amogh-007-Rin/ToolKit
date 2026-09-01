import { POST as legacyPost } from "@/app/api/ai-search/route";
import { idempotent } from "@/lib/idempotency";

export const POST = idempotent("ai.search.ask", legacyPost);
