import { GET, PATCH as legacyPatch, DELETE } from "@/app/api/posts/[id]/route";
import { idempotent } from "@/lib/idempotency";

export { GET, DELETE };
export const PATCH = idempotent("posts.update", legacyPatch);
