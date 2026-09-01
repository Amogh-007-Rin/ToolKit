import { PATCH as legacyPatch, DELETE } from "@/app/api/collections/[id]/route";
import { idempotent } from "@/lib/idempotency";

export { DELETE };
export const PATCH = idempotent("collections.update", legacyPatch);
