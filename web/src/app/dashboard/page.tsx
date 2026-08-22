"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Ellipsis,
  Heart,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { timeAgo } from "@/lib/timeAgo";

type FeedFilter = "all-feeds" | "featured-collections" | "sponcered-collections" | "matrix";

interface FeedPost {
  id: string;
  caption: string;
  tags: string[];
  createdAt: string;
  likeCount: number;
  commentCount: number;
  savedCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  author: { id: string; name: string | null; tag: string | null; image: string | null };
  media: { id: string; type: string; url: string }[];
}

interface FeedCollection {
  id: string;
  title: string;
  description: string;
  toolCount: number;
  updatedAt: string;
  owner: { id: string; name: string | null; tag: string | null; image: string | null };
  tools: {
    id: string;
    name: string;
    link: string | null;
    icon: string;
    logoUrl: string | null;
    description: string | null;
    reason: string | null;
  }[];
}

interface SponsoredTool {
  id: string;
  name: string;
  link: string | null;
  icon: string;
  logoUrl: string | null;
  description: string | null;
  reason: string | null;
  collectionId: string;
  collectionTitle: string;
  owner: { id: string; name: string | null; tag: string | null; image: string | null };
}

interface Creator {
  id: string;
  name: string | null;
  image: string | null;
  tag: string | null;
  role: string | null;
  followers: number;
}

function Avatar({
  image,
  name,
  size = 36,
  ring = false,
}: {
  image?: string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
}) {
  if (image) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full ${ring ? "bg-linear-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] p-0.5" : ""}`}
        style={{ width: size, height: size }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full bg-card">
          <Image src={image} alt={name ?? "User"} fill unoptimized className="object-cover" />
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
      style={{ width: size, height: size }}
    >
      {(name ?? "U").slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all-feeds");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [collections, setCollections] = useState<FeedCollection[]>([]);
  const [sponsoredTools, setSponsoredTools] = useState<SponsoredTool[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [mediaIndexByPost, setMediaIndexByPost] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/discover", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load discover feed");
        const data = (await res.json()) as {
          posts: FeedPost[];
          collections: FeedCollection[];
          sponsoredTools: SponsoredTool[];
          creators: Creator[];
        };
        if (!cancelled) {
          setPosts(data.posts ?? []);
          setCollections(data.collections ?? []);
          setSponsoredTools(data.sponsoredTools ?? []);
          setCreators(data.creators ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const lowered = query.trim().toLowerCase();
  const visiblePosts = useMemo(
    () =>
      posts.filter((post) =>
        `${post.caption} ${post.tags.join(" ")} ${post.author.name ?? ""} ${post.author.tag ?? ""}`
          .toLowerCase()
          .includes(lowered),
      ),
    [lowered, posts],
  );
  const visibleCollections = useMemo(
    () =>
      collections.filter((collection) =>
        `${collection.title} ${collection.description} ${collection.owner.name ?? ""} ${collection.owner.tag ?? ""}`
          .toLowerCase()
          .includes(lowered),
      ),
    [collections, lowered],
  );
  const visibleSponsored = useMemo(
    () =>
      sponsoredTools.filter((tool) =>
        `${tool.name} ${tool.description ?? ""} ${tool.collectionTitle} ${tool.owner.name ?? ""}`
          .toLowerCase()
          .includes(lowered),
      ),
    [lowered, sponsoredTools],
  );

  const chips: { key: FeedFilter; label: string; count: number; icon: ComponentType<{ size?: number }> }[] = [
    {
      key: "all-feeds",
      label: "All feeds",
      count: visiblePosts.length,
      icon: Compass,
    },
    {
      key: "featured-collections",
      label: "Featured Collections",
      count: visibleCollections.length,
      icon: Users,
    },
    {
      key: "sponcered-collections",
      label: "Sponcered Collections",
      count: visibleSponsored.length,
      icon: Star,
    },
    {
      key: "matrix",
      label: "Matrix",
      count: visiblePosts.length + visibleCollections.length + visibleSponsored.length,
      icon: Sparkles,
    },
  ];

  const handleLike = async (postId: string) => {
    const current = posts.find((post) => post.id === postId);
    if (!current) return;

    const nextLiked = !current.likedByMe;
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, likedByMe: nextLiked, likeCount: Math.max(0, post.likeCount + (nextLiked ? 1 : -1)) }
          : post,
      ),
    );
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error("like_failed");
      const data = (await res.json()) as { liked: boolean; likeCount: number };
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, likedByMe: data.liked, likeCount: data.likeCount } : post,
        ),
      );
    } catch {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, likedByMe: current.likedByMe, likeCount: current.likeCount } : post,
        ),
      );
    }
  };

  const handleSave = async (postId: string) => {
    const current = posts.find((post) => post.id === postId);
    if (!current) return;

    const nextSaved = !current.savedByMe;
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, savedByMe: nextSaved, savedCount: Math.max(0, post.savedCount + (nextSaved ? 1 : -1)) }
          : post,
      ),
    );
    try {
      const res = await fetch(`/api/posts/${postId}/save`, { method: "POST" });
      if (!res.ok) throw new Error("save_failed");
      const data = (await res.json()) as { saved: boolean; savedCount: number };
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, savedByMe: data.saved, savedCount: data.savedCount } : post,
        ),
      );
    } catch {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, savedByMe: current.savedByMe, savedCount: current.savedCount } : post,
        ),
      );
    }
  };

  return (
    <div data-lenis-prevent className="thin-scrollbar flex h-full min-h-0 flex-col gap-4 overflow-y-auto  p-4 shadow-sm backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const Icon = chip.icon;
          const active = chip.key === filter;
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {chip.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-primary-foreground/20" : "bg-card text-foreground"}`}>
                {chip.count}
              </span>
            </button>
          );
        })}
        <div className="ml-auto flex min-w-57.5 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 sm:max-w-[320px]">
          <Search size={18} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search creators, tools, posts..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none tracking-wide"
          />
        </div>
      </div>

      {filter === "all-feeds" ? (
        <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section>
            <div className="flex w-full flex-col gap-4">
              <div className="thin-scrollbar flex gap-4 overflow-x-auto rounded-3xl p-4">
                {creators.slice(0, 14).map((creator) => (
                  <Link
                    key={creator.id}
                    href={creator.tag ? `/profile/${encodeURIComponent(creator.tag)}` : "/dashboard/explore"}
                    className="flex min-w-14 flex-col items-center gap-1.5"
                  >
                    <Avatar image={creator.image} name={creator.name} size={58} ring />
                    <span className="max-w-16 truncate text-[11px] text-muted-foreground">
                      {creator.tag ?? creator.name ?? "creator"}
                    </span>
                  </Link>
                ))}
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-115 animate-pulse rounded-3xl bg-muted" />
                  ))}
                </div>
              ) : visiblePosts.length === 0 ? (
                <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">No posts matched your search.</p>
              ) : (
                <div className="space-y-4">
                  {visiblePosts.map((post) => {
                    const currentMediaIndex = mediaIndexByPost[post.id] ?? 0;
                    const media = post.media[currentMediaIndex] ?? post.media[0];
                    const hasMany = post.media.length > 1;
                    return (
                      <article key={post.id} className="overflow-hidden rounded-3xl">
                        <header className="flex items-center justify-between px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar image={post.author.image} name={post.author.name} size={36} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {post.author.name ?? "Creator"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                @{post.author.tag ?? "user"} • {timeAgo(post.createdAt)}
                              </p>
                            </div>
                          </div>
                          <button className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <Ellipsis size={18} />
                          </button>
                        </header>

                        <div className="relative">
                          {media ? (
                            media.type === "video" ? (
                              <video
                                src={media.url}
                                controls
                                className="max-h-180 min-h-90 w-full bg-black object-contain"
                              />
                            ) : (
                              <Image
                                src={media.url}
                                alt={post.caption || "Post"}
                                width={1000}
                                height={1200}
                                unoptimized
                                className="max-h-180 min-h-90 w-full object-cover rounded-2xl"
                              />
                            )
                          ) : null}
                          {hasMany ? (
                            <>
                              <button
                                onClick={() =>
                                  setMediaIndexByPost((prev) => ({
                                    ...prev,
                                    [post.id]: (currentMediaIndex - 1 + post.media.length) % post.media.length,
                                  }))
                                }
                                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white cursor-pointer hover:bg-black/80"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  setMediaIndexByPost((prev) => ({
                                    ...prev,
                                    [post.id]: (currentMediaIndex + 1) % post.media.length,
                                  }))
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white cursor-pointer hover:bg-black/80"
                              >
                                <ChevronRight size={16} />
                              </button>
                              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                                {post.media.map((item, index) => (
                                  <span
                                    key={item.id}
                                    className={`h-1.5 w-1.5 rounded-full ${index === currentMediaIndex ? "bg-white" : "bg-white/45"}`}
                                  />
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>

                        <div className="px-4 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleLike(post.id)}
                                className={`cursor-pointer transition-colors ${post.likedByMe ? "text-red-500" : "text-foreground hover:text-muted-foreground"}`}
                                aria-label="Like post"
                              >
                                <Heart size={22} fill={post.likedByMe ? "currentColor" : "none"} />
                              </button>
                              <button className="cursor-pointer text-foreground hover:text-muted-foreground" aria-label="Comment on post">
                                <MessageCircle size={21} />
                              </button>
                              <button className="cursor-pointer text-foreground hover:text-muted-foreground" aria-label="Share post">
                                <Send size={20} />
                              </button>
                            </div>
                            <button
                              onClick={() => handleSave(post.id)}
                              className={`cursor-pointer transition-colors ${post.savedByMe ? "text-primary" : "text-foreground hover:text-muted-foreground"}`}
                              aria-label="Save post"
                            >
                              <Bookmark size={20} fill={post.savedByMe ? "currentColor" : "none"} />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{post.likeCount.toLocaleString()} likes</p>
                          <p className="mt-1 line-clamp-2 text-sm text-foreground">
                            <span className="mr-1 font-semibold">{post.author.tag ?? post.author.name ?? "user"}</span>
                            {post.caption || "Shared a new post"}
                          </p>
                          {post.commentCount > 0 ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              View all {post.commentCount.toLocaleString()} comments
                            </p>
                          ) : null}
                          <p className="mt-1 text-[11px] tracking-wide text-muted-foreground">
                            {timeAgo(post.createdAt)}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="hidden space-y-4 xl:block">
            <section className="rounded-3xl border border-border/70 bg-sidebar p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">Suggested for you</h4>
                <Link href="/dashboard/explore" className="text-xs text-muted-foreground hover:text-foreground">
                  See all
                </Link>
              </div>
              <div className="space-y-2.5">
                {creators.slice(0, 8).map((creator) => (
                  <div key={creator.id} className="flex items-center gap-2.5">
                    <Avatar image={creator.image} name={creator.name} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{creator.tag ?? creator.name ?? "creator"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{creator.followers.toLocaleString()} followers</p>
                    </div>
                    <button className="cursor-pointer text-xs font-semibold text-primary">Follow</button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-border/70 bg-sidebar p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">Sponsored</h4>
                <span className="text-[11px] text-muted-foreground">Promoted</span>
              </div>
              <div className="space-y-2">
                {visibleSponsored.slice(0, 4).map((tool) => (
                  <a
                    key={`${tool.collectionId}-${tool.id}`}
                    href={tool.link ?? "#"}
                    target={tool.link ? "_blank" : undefined}
                    rel={tool.link ? "noreferrer" : undefined}
                    className="block rounded-xl border border-border/70 bg-card p-2.5"
                  >
                    <p className="truncate text-sm font-semibold text-foreground">{tool.name}</p>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">
                      {tool.description ?? tool.reason ?? "Sponsored tool for creators."}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      {filter === "featured-collections" ? (
        <section className="flex-1 rounded-3xl border border-border/70 bg-sidebar p-4">
          <h3 className="mb-3 text-lg font-bold text-foreground">Featured collections</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleCollections.map((collection) => (
              <article key={collection.id} className="rounded-2xl border border-border/70 bg-card p-3">
                <div className="flex items-center gap-2">
                  <Avatar image={collection.owner.image} name={collection.owner.name} size={28} />
                  <p className="truncate text-xs text-muted-foreground">
                    {collection.owner.name ?? "Creator"} @{collection.owner.tag ?? "user"}
                  </p>
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold text-foreground">{collection.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{collection.description || "No description available."}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {filter === "sponcered-collections" ? (
        <section className="flex-1 rounded-3xl border border-border/70 bg-sidebar p-4">
          <h3 className="mb-3 text-lg font-bold text-foreground">Sponcered collections</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSponsored.map((tool) => (
              <article key={`${tool.collectionId}-${tool.id}`} className="rounded-2xl border border-border/70 bg-card p-3">
                <p className="truncate text-sm font-semibold text-foreground">{tool.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tool.description ?? tool.reason ?? "Sponsored tool."}</p>
                {tool.link ? (
                  <a href={tool.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-primary">
                    Open
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {filter === "matrix" ? (
        <section className="flex-1 rounded-3xl border border-border/70 bg-sidebar p-4">
          <h3 className="mb-3 text-lg font-bold text-foreground">Matrix</h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {visiblePosts.flatMap((post) => post.media).map((media) => (
              <div key={media.id} className="overflow-hidden rounded-xl bg-muted">
                {media.type === "video" ? (
                  <video src={media.url} className="h-40 w-full object-cover" muted playsInline />
                ) : (
                  <Image src={media.url} alt="" width={320} height={320} unoptimized className="h-40 w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
