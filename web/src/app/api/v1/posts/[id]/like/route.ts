import { POST as legacyPost } from "@/app/api/posts/[id]/like/route";
import { idempotent } from "@/lib/idempotency";

export const POST = idempotent("posts.like.toggle", legacyPost);
