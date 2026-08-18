export interface ExploreUser {
  id: string;
  name: string | null;
  image: string | null;
  tag: string | null;
  bio: string | null;
  location: string | null;
  role: string | null;
  skills: string[];
  followers: number;
  following: number;
  createdAt?: string;
}

export const EXPLORE_FILTERS = ["All", "Professional", "Daily", "Creative", "New"] as const;
export type ExploreFilter = (typeof EXPLORE_FILTERS)[number];

export function belongsToFilter(user: ExploreUser, filter: ExploreFilter): boolean {
  if (filter === "All") return true;
  if (filter === "New") {
    return user.createdAt
      ? Date.now() - new Date(user.createdAt).getTime() < 30 * 86_400_000
      : false;
  }

  const text = [user.role, ...user.skills].filter(Boolean).join(" ").toLowerCase();
  if (filter === "Professional") {
    return /developer|engineer|designer|manager|founder|marketer|consultant|professional/.test(text);
  }
  if (filter === "Creative") {
    return /creative|design|artist|writer|video|music|content|photograph/.test(text);
  }
  return !belongsToFilter(user, "Professional") && !belongsToFilter(user, "Creative");
}
