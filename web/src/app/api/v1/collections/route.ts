import { GET, POST as legacyPost } from "@/app/api/collections/route";
import { idempotent } from "@/lib/idempotency";

export { GET };
export const POST = idempotent("collections.create", legacyPost);
