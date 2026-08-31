import { GET, POST as legacyPost } from "@/app/api/posts/route";
import { idempotent } from "@/lib/idempotency";

export { GET };
export const POST = idempotent("posts.create", legacyPost);
