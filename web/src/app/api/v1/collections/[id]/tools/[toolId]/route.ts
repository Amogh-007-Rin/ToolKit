import { PATCH as legacyPatch, DELETE } from "@/app/api/collections/[id]/tools/[toolId]/route";
import { idempotent } from "@/lib/idempotency";

export { DELETE };
export const PATCH = idempotent("tools.update", legacyPatch);
