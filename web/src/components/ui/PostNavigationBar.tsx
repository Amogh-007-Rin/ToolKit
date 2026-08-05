"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Bookmark, Star, Plus, Play } from "lucide-react";
import MakePostCard from "@/components/forms/MakePostCard";
import EditPostCard from "@/components/forms/EditPostCard";
import PostDetailCard from "@/components/ui/PostDetailCard";
import ConfirmDeleteCard from "@/app/dashboard/_components/cards/ConfirmDeleteCard";
import type { Post } from "@/types/posts";

type Tab = "posts" | "saved" | "featured";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "posts", label: "Posts", icon: LayoutGrid },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "featured", label: "Featured", icon: Star },
];

export default function PostNavigationBar() {
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
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
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center gap-2 h-full flex-1 border-t-2 transition-colors cursor-pointer ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={18} fill={active ? "currentColor" : "none"} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1">
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
                  <button
                    onClick={() => setIsMakingPost(true)}
                    className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    <Plus size={22} />
                    <span className="text-xs">Make a Post</span>
                  </button>
                  {posts.map((post) => {
                    const first = post.media[0];
                    return (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer group"
                      >
                        {first?.type === "video" ? (
                          <>
                            <video src={first.url} className="w-full h-full object-cover" muted />
                            <Play size={20} className="absolute inset-0 m-auto text-white/90" fill="currentColor" />
                          </>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={first?.url} alt={post.caption || "Post"} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                        )}
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
                  <button
                    onClick={() => setIsMakingPost(true)}
                    className="h-12 px-8 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Make a Post
                  </button>
                  <p className="text-sm text-muted-foreground">
                    When you share a post, it will appear on your profile
                  </p>
                </div>
              )
            )}
            {activeTab === "saved" && (
              <div className="w-full grid grid-cols-3 gap-1 p-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-muted/20 rounded-lg flex items-center justify-center"
                  >
                    <Bookmark size={20} className="text-muted-foreground/40" fill="currentColor" />
                  </div>
                ))}
              </div>
            )}
            {activeTab === "featured" && (
              <div className="w-full grid grid-cols-3 gap-1 p-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-muted/10 rounded-lg flex items-center justify-center"
                  >
                    <Star size={20} className="text-muted-foreground/40" fill="currentColor" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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
