import { PATCH as legacyPatch, DELETE } from "@/app/api/notifications/[id]/route";
import { idempotent } from "@/lib/idempotency";

export { DELETE };
export const PATCH = idempotent("notifications.read", legacyPatch);
