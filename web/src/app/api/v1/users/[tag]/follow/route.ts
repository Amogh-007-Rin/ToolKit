import { POST as legacyPost } from "@/app/api/users/[tag]/follow/route";
import { idempotent } from "@/lib/idempotency";

export const POST = idempotent("users.follow.toggle", legacyPost);
