import { api } from "@/lib/api";

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
  actor: Pick<Creator, "name" | "image" | "tag">;
}

export function getDiscover() {
  return api<{ posts: DiscoverPost[]; creators: Creator[]; collections: Collection[] }>("/dashboard/discover");
}

export function getCollections() {
  return api<{ collections: Collection[] }>("/collections");
}

export function createCollection(title: string, description = "") {
  return api<{ collection: Collection }>("/collections", {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export function updateCollection(id: string, title: string, description = "") { return api<{ collection: Collection }>(`/collections/${id}`, { method: "PATCH", body: JSON.stringify({ title, description }) }); }
export function deleteCollection(id: string) { return api<{ ok: true }>(`/collections/${id}`, { method: "DELETE" }); }
export function createTool(collectionId: string, input: ToolInput) { return api<{ tool: Tool }>(`/collections/${collectionId}/tools`, { method: "POST", body: JSON.stringify({ icon: "sparkles", ...input }) }); }
export function updateTool(collectionId: string, toolId: string, input: ToolInput) { return api<{ tool: Tool }>(`/collections/${collectionId}/tools/${toolId}`, { method: "PATCH", body: JSON.stringify({ icon: "sparkles", ...input }) }); }
export function deleteTool(collectionId: string, toolId: string) { return api<{ ok: true }>(`/collections/${collectionId}/tools/${toolId}`, { method: "DELETE" }); }
export function setShowcase(collectionIds: string[]) { return api<{ collectionIds: string[] }>("/collections/showcase", { method: "PATCH", body: JSON.stringify({ collectionIds }) }); }
export function togglePostLike(id: string) { return api<{ liked: boolean; likeCount: number }>(`/posts/${id}/like`, { method: "POST" }); }
export function togglePostSave(id: string) { return api<{ saved: boolean; savedCount: number }>(`/posts/${id}/save`, { method: "POST" }); }
export function createPost(caption: string, tags: string[], media: Array<{ key: string; type: string; order: number }>) { return api<{ post: DiscoverPost }>("/posts", { method: "POST", body: JSON.stringify({ caption, tags, media }) }); }
export function updatePost(id: string, caption: string, tags: string[], media: unknown[], removedMediaIds: string[] = []) { return api<{ post: DiscoverPost }>(`/posts/${id}`, { method: "PATCH", body: JSON.stringify({ caption, tags, media, removedMediaIds }) }); }
export function deletePost(id: string) { return api<{ ok: true }>(`/posts/${id}`, { method: "DELETE" }); }
export interface CommentItem { id: string; content: string; mine: boolean; createdAt: string; user: Pick<Creator, "id" | "name" | "image" | "tag"> }
export function getPost(id: string) { return api<{ post: DiscoverPost }>(`/posts/${id}`); }
export function getComments(id: string) { return api<{ comments: CommentItem[] }>(`/posts/${id}/comments`); }
export function createComment(id: string, content: string) { return api<{ comment: CommentItem }>(`/posts/${id}/comments`, { method: "POST", body: JSON.stringify({ content }) }); }
export function deleteComment(postId: string, commentId: string) { return api<{ ok: true }>(`/posts/${postId}/comments`, { method: "DELETE", body: JSON.stringify({ commentId }) }); }

export function searchCreators(query: string) {
  const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  return api<{ users: Creator[] }>(`/users/search${search}`);
}

export function getNotifications() {
  return api<{ notifications: NotificationItem[]; unreadCount: number; totalCount: number }>("/notifications");
}

export function markAllNotificationsRead() {
  return api<{ updated: number }>("/notifications", { method: "PATCH" });
}

export function markNotificationRead(id: string) { return api<{ read: true }>(`/notifications/${id}`, { method: "PATCH" }); }
export function deleteNotification(id: string) { return api<{ deleted: true }>(`/notifications/${id}`, { method: "DELETE" }); }
export function clearNotifications() { return api<{ deleted: number }>("/notifications", { method: "DELETE" }); }

export interface NotificationPreferences { notifyFollows: boolean; notifyLikes: boolean; notifyComments: boolean; notifyMessages: boolean; notifySocial: boolean; pushEnabled: boolean; pushPreview: boolean }
export function getNotificationPreferences() { return api<{ preferences: NotificationPreferences }>("/notifications/preferences"); }
export function updateNotificationPreferences(value: Partial<NotificationPreferences>) { return api<{ preferences: NotificationPreferences }>("/notifications/preferences", { method: "PATCH", body: JSON.stringify(value) }); }

export interface Profile { id: string; email: string; name: string | null; image: string | null; banner: string | null; bio: string | null; role: string | null; location: string | null; skills: string[]; tag: string | null; followers: number; following: number }
export function getProfile() { return api<{ user: Profile }>("/profile"); }
export function updateProfile(value: { name: string; bio: string; role: string; location: string; skills: string[]; tag: string | null }) { return api<{ user: Profile }>("/profile", { method: "PATCH", body: JSON.stringify(value) }); }
