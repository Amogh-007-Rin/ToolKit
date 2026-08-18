"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Bookmark, Folder, Plus, Play, Trash2, X } from "lucide-react";
import MakePostCard from "@/components/forms/MakePostCard";
import EditPostCard from "@/components/forms/EditPostCard";
import PostDetailCard from "@/components/ui/PostDetailCard";
import ConfirmDeleteCard from "@/app/dashboard/_components/cards/ConfirmDeleteCard";
import { TOOL_ICONS } from "@/app/dashboard/_components/tool-icons";
import type { Post } from "@/types/posts";
import type { Collection } from "@/types/collections";

type Tab = "posts" | "saved" | "collections";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "posts", label: "Posts", icon: LayoutGrid },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "collections", label: "Collections", icon: Folder },
];

function faviconUrl(link: string | null): string | null {
  if (!link) return null;
  try {
    const host = new URL(link).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

export default function PostNavigationBar() {
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isMakingPost, setIsMakingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isChoosingCollections, setIsChoosingCollections] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [collectionPostToRemove, setCollectionPostToRemove] = useState<Collection | null>(null);
  const [removingCollectionPost, setRemovingCollectionPost] = useState(false);
  const [expandedCollection, setExpandedCollection] = useState<Collection | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
      }
    } catch {
      // silently fail
    }
  }, []);

  const loadSavedPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts?filter=saved");
      if (res.ok) {
        const data = await res.json();
        setSavedPosts(data.posts ?? []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/posts", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPosts(data.posts ?? []);
      })
      .catch(() => {});
    fetch("/api/collections", { signal: controller.signal })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        const list = (data.collections ?? []) as Collection[];
        setCollections(list);
        setSelectedCollectionIds(list.filter((collection) => collection.showcased).map((collection) => collection.id));
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const saveShowcase = async () => {
    if (savingShowcase) return;
    setSavingShowcase(true);
    try {
      const res = await fetch("/api/collections/showcase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionIds: selectedCollectionIds }),
      });
      if (!res.ok) return;
      setCollections((current) =>
        current.map((collection) => ({
          ...collection,
          showcased: selectedCollectionIds.includes(collection.id),
        })),
      );
      setIsChoosingCollections(false);
    } finally {
      setSavingShowcase(false);
    }
  };

  const deletePost = async () => {
    if (!selectedPost) return;
    try {
      const res = await fetch(`/api/posts/${selectedPost.id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedPost(null);
        setIsConfirmingDelete(false);
        loadPosts();
      }
    } catch {
      // silently fail
    }
  };

  const removeCollectionPost = async () => {
    if (!collectionPostToRemove || removingCollectionPost) return;
    setRemovingCollectionPost(true);
    try {
      const remainingIds = selectedCollectionIds.filter((id) => id !== collectionPostToRemove.id);
      const res = await fetch("/api/collections/showcase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionIds: remainingIds }),
      });
      if (!res.ok) return;
      const removedId = collectionPostToRemove.id;
      setCollections((current) =>
        current.map((collection) =>
          collection.id === removedId ? { ...collection, showcased: false } : collection,
        ),
      );
      setSelectedCollectionIds(remainingIds);
      setCollectionPostToRemove(null);
    } finally {
      setRemovingCollectionPost(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-center w-full h-20 border-b border-border shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                if (id === "saved") loadSavedPosts();
              }}
              className={`post-switch-tab relative flex items-center justify-center gap-2 h-full flex-1 transition-colors cursor-pointer ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <motion.span
                key={active ? "active" : "inactive"}
                initial={active ? { scale: 0.5, rotate: activeTab === "saved" ? -25 : 0 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 12 }}
              >
                <Icon size={18} fill={active ? "currentColor" : "none"} />
              </motion.span>
              <span className="text-sm font-medium">{label}</span>
              {active && (
                <motion.span
                  layoutId="post-tab-border"
                  transition={
                    id === "posts"
                      ? { type: "spring", stiffness: 500, damping: 35 }
                      : { type: "spring", stiffness: 320, damping: 16 }
                  }
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-0.5 bg-foreground"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="relative flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === "posts" && (
              posts.length > 0 ? (
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
                    <Plus size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When you share a post, it will appear on your profile
                  </p>
                </div>
              )
            )}
            {activeTab === "saved" && (
              savedPosts.length > 0 ? (
                <div className="grid w-full grid-cols-3 gap-1 p-1 sm:grid-cols-4 lg:grid-cols-5">
                  {savedPosts.map((post, index) => {
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
                    <Bookmark size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No saved posts yet. Save posts you like to see them here.
                  </p>
                </div>
              )
            )}
            {activeTab === "collections" && (
              collections.some((collection) => collection.showcased) ? (
                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {collections.filter((collection) => collection.showcased).map((collection) => (
                    <motion.div
                      key={collection.id}
                      layoutId={`profile-collection-${collection.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedCollection(collection)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setExpandedCollection(collection);
                        }
                      }}
                      whileHover={{ y: -4 }}
                      className="relative flex min-h-48 min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-linear-to-br from-card via-card to-primary/6 p-5 text-left transition-colors hover:border-primary/40"
                    >
                      <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate text-lg font-semibold text-foreground">{collection.title}</h3>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {collection.tools.length} {collection.tools.length === 1 ? "tool" : "tools"}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setCollectionPostToRemove(collection);
                            }}
                            aria-label={`Remove ${collection.title} from profile`}
                            title="Remove from profile"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-5 text-muted-foreground">
                        {collection.description || "No description"}
                      </p>
                      {collection.tools.length > 0 && (
                        <div className="relative mt-auto flex items-center border-t border-border/70 pt-4">
                          <div className="flex min-w-0 items-center">
                            {collection.tools.slice(0, 8).map((tool) => {
                              const Icon = TOOL_ICONS[tool.icon] ?? TOOL_ICONS.sparkles;
                              const logoUrl = tool.logoUrl ?? faviconUrl(tool.link);
                              return logoUrl ? (
                                <div
                                  key={tool.id}
                                  className="relative -ml-2 h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-card bg-shade-background first:ml-0"
                                  title={tool.name}
                                >
                                  <Image src={logoUrl} fill sizes="32px" alt={tool.name} unoptimized className="object-contain" />
                                </div>
                              ) : (
                                <div
                                  key={tool.id}
                                  className="-ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-card bg-shade-background first:ml-0"
                                  title={tool.name}
                                >
                                  <Icon size={15} className="text-muted-foreground" />
                                </div>
                              );
                            })}
                          </div>
                          {collection.tools.length > 8 && (
                            <span className="ml-2 shrink-0 text-xs font-medium text-muted-foreground">
                              +{collection.tools.length - 8} more
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex w-full flex-col items-center justify-center gap-4 py-16">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
                    <Folder size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Choose collections to showcase on your public profile</p>
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>

        {activeTab !== "saved" && (
          <motion.button
            onClick={() => activeTab === "collections" ? setIsChoosingCollections(true) : setIsMakingPost(true)}
            title={activeTab === "collections" ? "Choose collections" : "Make a Post"}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors z-10"
          >
            <Plus size={26} />
          </motion.button>
        )}
      </div>

      <MakePostCard
        isOpen={isMakingPost}
        onClose={() => setIsMakingPost(false)}
        onPosted={loadPosts}
      />

      {selectedPost && (
        <PostDetailCard
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onEdit={() => setIsEditing(true)}
          onDelete={() => setIsConfirmingDelete(true)}
          onLiked={(postId, liked) =>
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId
                  ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) }
                  : p
              )
            )
          }
          onSaved={(postId, saved) => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId
                  ? { ...p, savedByMe: saved, savedCount: p.savedCount + (saved ? 1 : -1) }
                  : p
              )
            );
            if (!saved) {
              setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
            }
          }}
          onCommented={(postId, count) =>
            setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: count } : p)))
          }
        />
      )}

      {selectedPost && (
        <EditPostCard
          key={selectedPost.id}
          isOpen={isEditing}
          post={selectedPost}
          onClose={() => {
            setIsEditing(false);
            setSelectedPost(null);
          }}
          onSaved={loadPosts}
        />
      )}

      <ConfirmDeleteCard
        isOpen={isConfirmingDelete}
        title="post"
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={deletePost}
      />

      <ConfirmDeleteCard
        isOpen={collectionPostToRemove !== null}
        title="collection post"
        message={`Remove “${collectionPostToRemove?.title ?? ""}” from your profile? The collection and its tools will stay in Tools.`}
        confirmLabel="Remove"
        onCancel={() => {
          if (!removingCollectionPost) setCollectionPostToRemove(null);
        }}
        onConfirm={removeCollectionPost}
      />

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
                layoutId={`profile-collection-${expandedCollection.id}`}
                className="pointer-events-auto relative flex h-[70%] w-[70%] min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-linear-to-br from-card via-card to-primary/6 shadow-2xl max-sm:h-[85%] max-sm:w-[94%]"
              >
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
                <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-border p-5 sm:p-7">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-xl font-semibold text-foreground sm:text-2xl">
                        {expandedCollection.title}
                      </h2>
                      <span className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-xs text-muted-foreground">
                        {expandedCollection.tools.length} {expandedCollection.tools.length === 1 ? "tool" : "tools"}
                      </span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {expandedCollection.description || "No description"}
                    </p>
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
                                  <a
                                    href={tool.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate text-xs text-primary hover:underline"
                                  >
                                    {tool.link}
                                  </a>
                                )}
                              </div>
                            </div>
                            {tool.description && (
                              <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {tool.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      This collection has no tools yet.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChoosingCollections && (
          <>
            <motion.button
              type="button"
              aria-label="Close collection picker"
              className="fixed inset-0 z-40 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChoosingCollections(false)}
            />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                className="pointer-events-auto flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-border p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Showcase collections</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Select what visitors can see and import.</p>
                  </div>
                  <button onClick={() => setIsChoosingCollections(false)} className="cursor-pointer text-muted-foreground hover:text-foreground">
                    <X size={20} />
                  </button>
                </div>
                <div className="thin-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
                  {collections.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">Create a collection in Tools first.</p>
                  ) : collections.map((collection) => {
                    const selected = selectedCollectionIds.includes(collection.id);
                    return (
                      <button
                        key={collection.id}
                        onClick={() => setSelectedCollectionIds((current) => selected ? current.filter((id) => id !== collection.id) : [...current, collection.id])}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border p-4 text-left transition-colors ${selected ? "border-primary bg-primary/8" : "border-border hover:bg-muted/50"}`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{collection.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{collection.tools.length} {collection.tools.length === 1 ? "tool" : "tools"}</p>
                        </div>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {selected && <span className="text-xs">✓</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-border p-4">
                  <button
                    onClick={saveShowcase}
                    disabled={savingShowcase}
                    className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {savingShowcase ? "Saving…" : "Save showcase"}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
