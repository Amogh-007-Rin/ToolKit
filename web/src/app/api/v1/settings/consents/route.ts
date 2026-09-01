import { GET, POST as legacyPost } from "@/app/api/settings/consents/route";
import { idempotent } from "@/lib/idempotency";

export { GET };
export const POST = idempotent("consent.record", legacyPost);
