import { GET, POST as legacyPost, DELETE } from "@/app/api/posts/[id]/comments/route";
import { idempotent } from "@/lib/idempotency";

export { GET, DELETE };
export const POST = idempotent("comments.create", legacyPost);
