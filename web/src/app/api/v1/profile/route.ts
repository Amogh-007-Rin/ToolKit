import { GET, PATCH as legacyPatch } from "@/app/api/profile/route";
import { idempotent } from "@/lib/idempotency";

export { GET };
export const PATCH = idempotent("profile.update", legacyPatch);
