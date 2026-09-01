import { GET, PATCH as legacyPatch } from "@/app/api/settings/privacy/route";
import { idempotent } from "@/lib/idempotency";

export { GET };
export const PATCH = idempotent("preferences.privacy", legacyPatch);
