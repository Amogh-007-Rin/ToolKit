import { POST as legacyPost } from "@/app/api/collections/import/route";
import { idempotent } from "@/lib/idempotency";

export const POST = idempotent("collections.import", legacyPost);
