import { api, queueableApi } from "@/lib/api";
import { contractClient, contractData } from "@/lib/contractClient";

export interface Creator {
  id: string;
  name: string | null;
  image: string | null;
  tag: string | null;
  role: string | null;
  bio?: string | null;
  location?: string | null;
  skills?: string[];
  followers: number;
}

export interface Tool {
  id: string;
  name: string;
  link: string | null;
  icon: string;
  logoUrl?: string | null;
  description: string | null;
  reason: string | null;
}

export interface ToolInput { name: string; link?: string; icon?: string; logoUrl?: string | null; description?: string | null; reason?: string | null }

export interface Collection {
  id: string;
  title: string;
  description: string;
  showcased: boolean;
  tools: Tool[];
}

export interface DiscoverPost {
  id: string;
  caption: string;
  tags: string[];
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  savedCount?: number;
  mine?: boolean;
  author: Pick<Creator, "id" | "name" | "image" | "tag">;
  media: Array<{ id: string; type: string; url: string }>;
}

export interface NotificationItem {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  postId: string | null;
  commentId: string | null;
  actor: Pick<Creator, "name" | "image" | "tag">;
}

export function getDiscover() {
  return api<{ posts: DiscoverPost[]; creators: Creator[]; collections: Collection[] }>("/dashboard/discover");
}

export async function getCollections() {
  return contractData<{ collections: Collection[] }>(await contractClient.GET("/collections"));
}

export function createCollection(title: string, description = "") {
  return queueableApi<{ collection: Collection }>("collections.create", "/collections", {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export function updateCollection(id: string, title: string, description = "") { return queueableApi<{ collection: Collection }>("collections.update", `/collections/${id}`, { method: "PATCH", body: JSON.stringify({ title, description }) }); }
export function deleteCollection(id: string) { return api<{ ok: true }>(`/collections/${id}`, { method: "DELETE" }); }
export function createTool(collectionId: string, input: ToolInput) { return queueableApi<{ tool: Tool }>("tools.create", `/collections/${collectionId}/tools`, { method: "POST", body: JSON.stringify({ icon: "sparkles", ...input }) }); }
export function updateTool(collectionId: string, toolId: string, input: ToolInput) { return queueableApi<{ tool: Tool }>("tools.update", `/collections/${collectionId}/tools/${toolId}`, { method: "PATCH", body: JSON.stringify({ icon: "sparkles", ...input }) }); }
export function deleteTool(collectionId: string, toolId: string) { return api<{ ok: true }>(`/collections/${collectionId}/tools/${toolId}`, { method: "DELETE" }); }
export function setShowcase(collectionIds: string[]) { return queueableApi<{ collectionIds: string[] }>("collections.showcase", "/collections/showcase", { method: "PATCH", body: JSON.stringify({ collectionIds }) }); }
export function togglePostLike(id: string) { return queueableApi<{ liked: boolean; likeCount: number }>("posts.like.toggle", `/posts/${id}/like`, { method: "POST" }); }
export function togglePostSave(id: string) { return queueableApi<{ saved: boolean; savedCount: number }>("posts.save.toggle", `/posts/${id}/save`, { method: "POST" }); }
export function createPost(caption: string, tags: string[], media: Array<{ key: string; type: string; order: number }>) { return queueableApi<{ post: DiscoverPost }>("posts.create", "/posts", { method: "POST", body: JSON.stringify({ caption, tags, media }) }); }
export function updatePost(id: string, caption: string, tags: string[], media: unknown[], removedMediaIds: string[] = []) { return queueableApi<{ post: DiscoverPost }>("posts.update", `/posts/${id}`, { method: "PATCH", body: JSON.stringify({ caption, tags, media, removedMediaIds }) }); }
export function deletePost(id: string) { return api<{ ok: true }>(`/posts/${id}`, { method: "DELETE" }); }
export interface CommentItem { id: string; content: string; mine: boolean; createdAt: string; user: Pick<Creator, "id" | "name" | "image" | "tag"> }
export function getPost(id: string) { return api<{ post: DiscoverPost }>(`/posts/${id}`); }
export function getComments(id: string) { return api<{ comments: CommentItem[] }>(`/posts/${id}/comments`); }
export function createComment(id: string, content: string) { return queueableApi<{ comment: CommentItem }>("comments.create", `/posts/${id}/comments`, { method: "POST", body: JSON.stringify({ content }) }); }
export function deleteComment(postId: string, commentId: string) { return api<{ ok: true }>(`/posts/${postId}/comments`, { method: "DELETE", body: JSON.stringify({ commentId }) }); }

export function searchCreators(query: string) {
  const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  return api<{ users: Creator[] }>(`/users/search${search}`);
}

export function getNotifications(filter?: { type?: string; unread?: boolean }) {
  const params = new URLSearchParams();
  if (filter?.type) params.set("type", filter.type);
  if (filter?.unread) params.set("unread", "true");
  const query = params.size ? `?${params}` : "";
  return api<{ notifications: NotificationItem[]; unreadCount: number; totalCount: number }>(`/notifications${query}`);
}

export function markAllNotificationsRead() {
  return queueableApi<{ updated: number }>("notifications.read-all", "/notifications", { method: "PATCH" });
}

export function markNotificationRead(id: string) { return queueableApi<{ read: true }>("notifications.read", `/notifications/${id}`, { method: "PATCH" }); }
export function deleteNotification(id: string) { return api<{ deleted: true }>(`/notifications/${id}`, { method: "DELETE" }); }
export function clearNotifications() { return api<{ deleted: number }>("/notifications", { method: "DELETE" }); }

export interface NotificationPreferences { notifyFollows: boolean; notifyLikes: boolean; notifyComments: boolean; notifyMessages: boolean; notifySocial: boolean; pushEnabled: boolean; pushPreview: boolean }
export function getNotificationPreferences() { return api<{ preferences: NotificationPreferences }>("/notifications/preferences"); }
export function updateNotificationPreferences(value: Partial<NotificationPreferences>) { return queueableApi<{ preferences: NotificationPreferences }>("preferences.notifications", "/notifications/preferences", { method: "PATCH", body: JSON.stringify(value) }); }

export interface Profile { id: string; email: string; name: string | null; image: string | null; banner: string | null; bio: string | null; role: string | null; location: string | null; skills: string[]; tag: string | null; followers: number; following: number }
export function getProfile() { return api<{ user: Profile }>("/profile"); }
export function updateProfile(value: { name: string; bio: string; role: string; location: string; skills: string[]; tag: string | null; image?: string | null; banner?: string | null }) { return queueableApi<{ user: Profile }>("profile.update", "/profile", { method: "PATCH", body: JSON.stringify(value) }); }

export interface PublicProfile extends Omit<Profile, "email"> { followedByMe: boolean; isMe: boolean; collections: Collection[]; posts: DiscoverPost[] }
export function getPublicProfile(tag: string) { return api<{ user: PublicProfile }>(`/users/${encodeURIComponent(tag)}`); }
export function toggleFollow(tag: string) { return queueableApi<{ followed: boolean; followers: number }>("users.follow.toggle", `/users/${encodeURIComponent(tag)}/follow`, { method: "POST" }); }
export function importCollection(collectionId: string, destinationCollectionId?: string, toolId?: string) { return queueableApi<{ collection?: Collection; tool?: Tool }>("collections.import", "/collections/import", { method: "POST", body: JSON.stringify({ collectionId, destinationCollectionId, toolId }) }); }
export function getSavedPosts() { return api<{ posts: DiscoverPost[] }>("/posts/saved"); }
