import { POST as legacyPost } from "@/app/api/posts/[id]/save/route";
import { idempotent } from "@/lib/idempotency";

export const POST = idempotent("posts.save.toggle", legacyPost);
