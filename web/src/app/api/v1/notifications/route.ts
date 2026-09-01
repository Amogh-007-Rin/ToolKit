import { GET, PATCH as legacyPatch, DELETE } from "@/app/api/notifications/route";
import { idempotent } from "@/lib/idempotency";

export { GET, DELETE };
export const PATCH = idempotent("notifications.read-all", legacyPatch);
