"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Star,
  UserPlus,
  Check,
  MessageCircle,
  UserRound,
  Play,
  Folder,
  LayoutGrid,
  Download,
  X,
  CheckCircle2,
} from "lucide-react";
import ProfileSkeleton from "@/components/ui/loaders/ProfileSkeleton";
import Multibutton from "@/app/dashboard/_components/buttons/Multibutton";
import SkillTag from "@/components/ui/tags/SkillTag";
import PostDetailCard from "@/components/ui/PostDetailCard";
import type { Post } from "@/types/posts";
import type { Collection, Tool } from "@/types/collections";
import { TOOL_ICONS } from "@/app/dashboard/_components/tool-icons";

function faviconUrl(link: string | null): string | null {
  if (!link) return null;
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(link).hostname}&sz=64`;
  } catch {
    return null;
  }
}

interface PublicUser {
  id: string;
  name: string | null;
  image: string | null;
  banner: string | null;
  tag: string | null;
  bio: string | null;
  role: string | null;
  location: string | null;
  skills: string[];
  followers: number;
  following: number;
  followedByMe: boolean;
  isMe: boolean;
  showPosts: boolean;
  showCollections: boolean;
  collections: Collection[];
}

export default function VisiterProfile() {
  const params = useParams<{ tag: string }>();
  const router = useRouter();
  const tag = params.tag;
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<PublicUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<"collections" | "posts">("posts");
  const [myCollections, setMyCollections] = useState<Collection[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [toolToImport, setToolToImport] = useState<{ collection: Collection; tool: Tool } | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [expandedCollection, setExpandedCollection] = useState<Collection | null>(null);

  useEffect(() => {
    if (!importSuccess) return;
    const timer = window.setTimeout(() => setImportSuccess(null), 3200);
    return () => window.clearTimeout(timer);
  }, [importSuccess]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(tag)}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUser(data.user);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tag]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/posts?authorId=${uid}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setPosts(data.posts ?? []);
        }
      } catch {
        // silently fail
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.isMe) return;
    fetch("/api/collections")
      .then((res) => res.ok ? res.json() : { collections: [] })
      .then((data) => setMyCollections(data.collections ?? []))
      .catch(() => {});
  }, [user]);

  const importCollection = async (collection: Collection) => {
    if (importing || myCollections.some((item) => item.importedFromId === collection.id)) return;
    setImporting(collection.id);
    setImportNotice(null);
    try {
      const res = await fetch("/api/collections/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: collection.id }),
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      setMyCollections((current) => [data.collection, ...current]);
      setImportSuccess(`“${collection.title}” was added to your collections`);
    } catch {
      setImportNotice("Could not import this collection. Please try again.");
    } finally {
      setImporting(null);
    }
  };

  const collectionImported = (collectionId: string) =>
    myCollections.some((collection) => collection.importedFromId === collectionId);

  const importTool = async (destinationCollectionId: string) => {
    if (!toolToImport || importing) return;
    const { collection, tool } = toolToImport;
    setImporting(tool.id);
    setImportNotice(null);
    try {
      const res = await fetch("/api/collections/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: collection.id,
          toolId: tool.id,
          destinationCollectionId,
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      setMyCollections((current) => current.map((item) =>
        item.id === destinationCollectionId ? { ...item, tools: [...item.tools, data.tool] } : item
      ));
      setImportSuccess(`“${tool.name}” was added to your collection`);
      setToolToImport(null);
    } catch {
      setImportNotice("Could not import this tool. Please try again.");
    } finally {
      setImporting(null);
    }
  };

  useEffect(() => {
    const wrapper = scrollRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: true,
      autoRaf: true,
    });
    const resizeObserver = new ResizeObserver(() => lenis.resize());
    resizeObserver.observe(wrapper);
    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
      lenis.destroy();
    };
  }, [loading, notFound]);

  const toggleFollow = async () => {
    if (!user || followBusy) return;
    setFollowBusy(true);
    const previous = user.followedByMe;
    setUser((u) =>
      u ? { ...u, followedByMe: !u.followedByMe, followers: u.followers + (u.followedByMe ? -1 : 1) } : u
    );
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(tag)}/follow`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setUser((u) => (u ? { ...u, followedByMe: data.followed, followers: data.followers } : u));
    } catch {
      setUser((u) =>
        u ? { ...u, followedByMe: previous, followers: u.followers + (previous ? 1 : -1) } : u
      );
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center gap-6">
        <button
          onClick={() => router.back()}
          className="fixed top-6 left-6 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer z-10 shadow-2xs"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
          <UserRound size={24} className="text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">User not found</p>
        <button
          onClick={() => router.push("/dashboard/explore")}
          className="h-10 px-6 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div ref={scrollRef} data-lenis-wrapper className="h-dvh w-full overflow-y-auto bg-background">
      <div ref={contentRef} className="relative min-h-full w-full">
      <button
        onClick={() => router.back()}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card shadow-2xs transition-colors hover:bg-muted sm:left-6 sm:top-6"
      >
        <ArrowLeft size={20} className="text-foreground" />
      </button>

      <div className="profile-container w-full min-h-screen flex flex-col">
        <div className="banner-container w-full h-[25vh] bg-linear-to-br from-primary/20 via-shade-background to-card relative">
          {user.banner ? (
            <Image
              src={user.banner}
              alt="Banner"
              fill
              className="object-cover"
              unoptimized
              loading="eager"
            />
          ) : null}
        </div>

        <div className="profile-info relative w-full px-4 pb-5 pt-18 sm:px-8 sm:pt-24 lg:h-[35vh] lg:min-h-80 lg:px-0 lg:pb-0 lg:pt-0">
          <div className="absolute -top-14 left-4 z-10 flex h-28 w-28 flex-col items-center justify-center rounded-full sm:-top-20 sm:left-24 sm:h-40 sm:w-40">
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-background bg-shade-background">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "User"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl font-bold text-foreground">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="part-1 mt-1 flex w-full flex-col items-start gap-2 sm:items-end lg:mt-4 lg:h-[20%] lg:justify-center lg:px-10">
            <div className="flex items-center gap-2 px-1.5">
              <p className="text-foreground">Current Role</p>
              <BriefcaseBusiness size={18} className="text-foreground" />
            </div>
            <span className="px-4 py-1 rounded-full bg-shade-background flex items-center justify-center">
              <p className="text-foreground font-bold">{user.role || "..."}</p>
            </span>
          </div>

          <div className="part-2 mt-5 flex items-center lg:mt-0 lg:h-[20%]">
            <div className="profile-name relative flex w-full flex-col lg:h-full lg:justify-center">
              <p className="text-2xl font-bold text-foreground lg:absolute lg:left-27 lg:top-4">
                {user.name || "Unnamed User"}
              </p>
              <p className="text-sm font-light text-foreground lg:absolute lg:left-27 lg:top-12">
                {user.tag ? `@${user.tag}` : "@toolkit-tag"}
              </p>
            </div>
          </div>

          <div className="part-3 mt-4 flex items-center lg:mt-0 lg:min-h-[10%] lg:py-2">
            <div className="profile-occupation flex w-full flex-col gap-3 lg:min-h-full lg:flex-row lg:items-center">
              <p className="w-full max-w-xl whitespace-normal wrap-break-word text-foreground leading-5 lg:ml-27 lg:w-[40%]">
                {user.bio || "No bio yet"}
              </p>
              <p className="text-base text-muted-foreground lg:ml-auto lg:mr-10 lg:shrink-0">
                {user.followers} followers · {user.following} following
              </p>
            </div>
          </div>

          <div className="part-4 mt-4 flex flex-col gap-3 lg:mt-0 lg:h-[12%] lg:flex-row lg:items-center">
            <div className="profile-location relative flex items-start lg:h-full lg:w-[50%]">
              <p className="text-foreground lg:absolute lg:left-27">
                {user.location || "No location"}
              </p>
            </div>
            <div className="flex items-center gap-2 lg:h-full lg:w-[50%] lg:justify-end lg:px-10">
              <p className="text-foreground">Skills</p>
              <Star size={16} className="text-foreground" />
            </div>
          </div>

          <div className="part-5 mt-3 flex w-full flex-col gap-3 lg:mt-0 lg:h-[25%] lg:flex-row lg:items-center">
            <div className="left-part relative flex items-center lg:h-full lg:w-[30%]">
              {user.isMe ? (
                <button
                  onClick={() => router.push("/profile")}
                  className="flex h-11 cursor-pointer items-center justify-center rounded-4xl bg-card px-5 lg:absolute lg:left-27 lg:h-[30%]"
                >
                  <p className="text-foreground">This is you</p>
                </button>
              ) : (
                <div className="flex h-11 w-full items-start gap-2 sm:w-75 lg:absolute lg:left-27 lg:h-full">
                  <Multibutton
                    tag="follow-profile"
                    label={user.followedByMe ? "Following" : "Follow"}
                    icon={user.followedByMe ? Check : UserPlus}
                    onClick={toggleFollow}
                    className={`h-11! rounded-4xl lg:h-[50%]! ${
                      user.followedByMe ? "bg-foreground text-card" : ""
                    } w-[50%]`}
                    iconClassName={user.followedByMe ? "text-card" : "text-foreground"}
                    textClassName={user.followedByMe ? "text-card" : "text-foreground"}
                  />
                  <Multibutton
                    tag="message-profile"
                    label="Message"
                    icon={MessageCircle}
                    onClick={() => router.push(`/dashboard/messages?user=${user.id}`)}
                    className="h-11! w-[50%] rounded-4xl bg-foreground text-card lg:h-[50%]!"
                    iconClassName="text-card"
                    textClassName="text-card"
                  />
                </div>
              )}
            </div>
            <div className="right-part flex flex-wrap items-start gap-2 lg:h-full lg:w-[70%] lg:justify-end lg:px-10 lg:py-2">
              {user.skills.length > 0
                ? user.skills.map((skill) => <SkillTag key={skill} skill={skill} />)
                : <p className="text-muted-foreground text-sm">No skills added yet</p>}
            </div>
          </div>
        </div>

        <div className="part-3-post-navigator w-full py-4">
          <div className="mb-4 mt-4 flex h-16 w-full border-b border-border">
            {([
              { id: "posts" as const, label: "Posts", icon: LayoutGrid },
              { id: "collections" as const, label: "Collections", icon: Folder },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex flex-1 cursor-pointer items-center justify-center gap-2 text-sm font-medium transition-colors ${activeTab === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <motion.span
                  key={activeTab === id ? "active" : "inactive"}
                  initial={activeTab === id ? { scale: 0.65, rotate: -12 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 16 }}
                >
                  <Icon size={18} fill={activeTab === id ? "currentColor" : "none"} />
                </motion.span>
                {label}
                {activeTab === id && (
                  <motion.span
                    layoutId="visitor-profile-tab-indicator"
                    className="absolute bottom-0 h-0.5 w-24 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {importNotice && (
            <div className="mx-4 mb-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
              {importNotice}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
          {activeTab === "collections" ? (
            user.collections.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {user.collections.map((collection) => (
                  <motion.button
                    key={collection.id}
                    layoutId={`visitor-collection-${collection.id}`}
                    onClick={() => setExpandedCollection(collection)}
                    className="group relative flex min-h-56 cursor-pointer flex-col gap-3 overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-card via-card to-primary/6 p-5 text-left transition-colors hover:border-primary/40"
                    whileHover={{ y: -4 }}
                  >
                    <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-80" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-foreground">{collection.title}</h3>
                        <span className="mt-1 inline-flex rounded-full border border-border/70 bg-background/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {collection.tools.length} {collection.tools.length === 1 ? "tool" : "tools"}
                        </span>
                      </div>
                    </div>
                    <p className="relative line-clamp-3 text-sm leading-5 text-muted-foreground">{collection.description || "No description"}</p>
                    {collection.tools.length > 0 && (
                      <div className="relative mt-auto flex items-center border-t border-border/70 pt-4">
                        <div className="flex items-center">
                          {collection.tools.slice(0, 8).map((tool) => {
                            const Icon = TOOL_ICONS[tool.icon] ?? TOOL_ICONS.sparkles;
                            const logoUrl = tool.logoUrl ?? faviconUrl(tool.link);
                            return logoUrl ? (
                              <span key={tool.id} className="relative -ml-2 h-8 w-8 first:ml-0 overflow-hidden rounded-full border-2 border-card bg-shade-background" title={tool.name}>
                                <Image src={logoUrl} fill sizes="32px" alt={tool.name} unoptimized className="object-contain" />
                              </span>
                            ) : (
                              <span key={tool.id} className="-ml-2 flex h-8 w-8 first:ml-0 items-center justify-center rounded-full border-2 border-card bg-shade-background" title={tool.name}>
                                <Icon size={15} className="text-muted-foreground" />
                              </span>
                            );
                          })}
                        </div>
                        {collection.tools.length > 8 && <span className="ml-2 text-xs font-medium text-muted-foreground">+{collection.tools.length - 8} more</span>}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="flex w-full flex-col items-center justify-center gap-4 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
                  <Folder size={24} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No showcased collections yet</p>
              </div>
            )
          ) : posts.length > 0 ? (
            <div className="grid w-full grid-cols-3 gap-1 p-1 sm:grid-cols-4 lg:grid-cols-5">
              {posts.map((post, index) => {
                const first = post.media[0];
                return (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="relative aspect-4/5 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer group"
                  >
                    {first?.type === "video" ? (
                      <>
                        <video src={first.url} className="w-full h-full object-cover" muted />
                        <Play size={20} className="absolute inset-0 m-auto text-white/90" fill="currentColor" />
                      </>
                    ) : first?.url ? (
                      <Image
                        src={first.url}
                        alt={post.caption || "Post"}
                        fill
                        sizes="40vw"
                        quality={100}
                        unoptimized
                        loading={index < 5 ? "eager" : "lazy"}
                        className="object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : null}
                    {post.media.length > 1 && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/60 text-white text-xs flex items-center justify-center">
                        {post.media.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                <UserRound size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No posts yet</p>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {expandedCollection && (
          <>
            <motion.button
              type="button"
              aria-label="Close expanded collection"
              className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedCollection(null)}
            />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
              <motion.div
                layoutId={`visitor-collection-${expandedCollection.id}`}
                className="pointer-events-auto relative flex h-[70%] w-[70%] min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-linear-to-br from-card via-card to-primary/6 shadow-2xl max-sm:h-[85%] max-sm:w-[94%]"
              >
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
                <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-border p-5 sm:p-7">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-xl font-semibold text-foreground sm:text-2xl">{expandedCollection.title}</h2>
                      <span className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-xs text-muted-foreground">
                        {expandedCollection.tools.length} {expandedCollection.tools.length === 1 ? "tool" : "tools"}
                      </span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{expandedCollection.description || "No description"}</p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setExpandedCollection(null)}
                    whileHover={{ rotate: 90, scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close collection"
                  >
                    <X size={20} />
                  </motion.button>
                </div>

                <div
                  data-lenis-prevent
                  className="thin-scrollbar relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-4 sm:p-6"
                >
                  {expandedCollection.tools.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                      {expandedCollection.tools.map((tool) => {
                        const Icon = TOOL_ICONS[tool.icon] ?? TOOL_ICONS.sparkles;
                        const logoUrl = tool.logoUrl ?? faviconUrl(tool.link);
                        return (
                          <div key={tool.id} className="flex min-h-32 flex-col rounded-2xl border border-border/80 bg-card/80 p-4">
                            <div className="flex items-start gap-3">
                              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-shade-background">
                                {logoUrl ? (
                                  <Image src={logoUrl} fill sizes="40px" alt={tool.name} unoptimized className="object-contain" />
                                ) : (
                                  <Icon size={18} className="text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-foreground">{tool.name}</p>
                                {tool.link && (
                                  <a href={tool.link} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-primary hover:underline">
                                    {tool.link}
                                  </a>
                                )}
                              </div>
                              {!user.isMe && (
                                <button
                                  onClick={() => setToolToImport({ collection: expandedCollection, tool })}
                                  title={`Import ${tool.name}`}
                                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                  <Download size={15} />
                                </button>
                              )}
                            </div>
                            {tool.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{tool.description}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">This collection has no tools yet.</div>
                  )}
                </div>

                {!user.isMe && (
                  <div className="relative shrink-0 border-t border-border bg-card/70 p-4 sm:px-6">
                    <button
                      onClick={() => importCollection(expandedCollection)}
                      disabled={importing !== null || collectionImported(expandedCollection.id)}
                      className="ml-auto flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-medium text-card disabled:opacity-50"
                    >
                      {collectionImported(expandedCollection.id) ? <Check size={16} /> : <Download size={16} />}
                      {collectionImported(expandedCollection.id)
                        ? "Collection imported"
                        : importing === expandedCollection.id
                          ? "Importing…"
                          : "Import entire collection"}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importSuccess && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="fixed left-1/2 top-6 z-70 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-2xl"
          >
            <motion.span
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 520, damping: 20 }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <CheckCircle2 size={20} strokeWidth={2.5} />
            </motion.span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Import complete</p>
              <p className="max-w-72 truncate text-xs text-muted-foreground">{importSuccess}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedPost && (
        <PostDetailCard
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onEdit={() => setSelectedPost(null)}
          onDelete={() => setSelectedPost(null)}
          onLiked={(postId, liked) =>
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId
                  ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) }
                  : p
              )
            )
          }
          onSaved={(postId, saved) =>
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId
                  ? { ...p, savedByMe: saved, savedCount: p.savedCount + (saved ? 1 : -1) }
                  : p
              )
            )
          }
          onCommented={(postId, count) =>
            setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: count } : p)))
          }
        />
      )}
      {toolToImport && (
        <>
          <button
            type="button"
            aria-label="Close import dialog"
            onClick={() => setToolToImport(null)}
            className="fixed inset-0 z-40 bg-black/60"
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="pointer-events-auto flex max-h-[75vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Import {toolToImport.tool.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Choose one of your collections.</p>
                </div>
                <button onClick={() => setToolToImport(null)} className="cursor-pointer text-muted-foreground hover:text-foreground"><X size={20} /></button>
              </div>
              <div className="thin-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
                {myCollections.length > 0 ? myCollections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => importTool(collection.id)}
                    disabled={importing !== null}
                    className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-border p-4 text-left hover:bg-muted/50 disabled:opacity-50"
                  >
                    <span className="truncate font-medium text-foreground">{collection.title}</span>
                    <span className="text-xs text-muted-foreground">{collection.tools.length} tools</span>
                  </button>
                )) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">You need a collection before importing a tool.</p>
                    <button onClick={() => router.push("/dashboard/tools")} className="mt-4 cursor-pointer text-sm font-medium text-primary">Create a collection</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
