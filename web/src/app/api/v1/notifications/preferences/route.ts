import { GET, PATCH as legacyPatch } from "@/app/api/notifications/preferences/route";
import { idempotent } from "@/lib/idempotency";

export { GET };
export const PATCH = idempotent("preferences.notifications", legacyPatch);
