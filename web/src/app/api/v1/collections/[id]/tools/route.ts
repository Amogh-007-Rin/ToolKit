import { POST as legacyPost } from "@/app/api/collections/[id]/tools/route";
import { idempotent } from "@/lib/idempotency";

export const POST = idempotent("tools.create", legacyPost);
