"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Bookmark, Star, Plus, Play } from "lucide-react";
import MakePostCard from "@/components/forms/MakePostCard";
import EditPostCard from "@/components/forms/EditPostCard";
import PostDetailCard from "@/components/ui/PostDetailCard";
import ConfirmDeleteCard from "@/app/dashboard/_components/cards/ConfirmDeleteCard";
import type { Post } from "@/types/posts";

type Tab = "posts" | "saved" | "tagged";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "posts", label: "Posts", icon: LayoutGrid },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "tagged", label: "tagged", icon: Star },
];

export default function PostNavigationBar() {
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isMakingPost, setIsMakingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
    return () => controller.abort();
  }, []);

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
                <div className="w-full grid grid-cols-5 gap-1 p-1">
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
                <div className="w-full grid grid-cols-5 gap-1 p-1">
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
            {activeTab === "tagged" && (
              <div className="w-full flex flex-col items-center justify-center gap-4 py-16">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                  <Star size={24} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No tagged posts yet
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {activeTab !== "saved" && (
          <motion.button
            onClick={() => setIsMakingPost(true)}
            title="Make a Post"
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
    </div>
  );
}
