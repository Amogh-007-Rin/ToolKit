import { PATCH as legacyPatch } from "@/app/api/collections/showcase/route";
import { idempotent } from "@/lib/idempotency";

export const PATCH = idempotent("collections.showcase", legacyPatch);
