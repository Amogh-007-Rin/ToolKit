"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Heart,
  MessageCircle,
  Bookmark,
  Loader2,
} from "lucide-react";
import type { Post, PostComment } from "@/types/posts";

interface PostDetailCardProps {
  post: Post;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLiked: (postId: string, liked: boolean) => void;
  onSaved: (postId: string, saved: boolean) => void;
  onCommented: (postId: string, count: number) => void;
}

export default function PostDetailCard({
  post,
  onClose,
  onEdit,
  onDelete,
  onLiked,
  onSaved,
  onCommented,
}: PostDetailCardProps) {
  const [mediaIndex, setMediaIndex] = useState(0);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentInput, setCommentInput] = useState("");
  const [commentPosting, setCommentPosting] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saved, setSaved] = useState(post.savedByMe);
  const [savedCount, setSavedCount] = useState(post.savedCount);
  const [saveBusy, setSaveBusy] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  const media = post.media;
  const current = media[mediaIndex];
  const prev = () => setMediaIndex((i) => (i - 1 + media.length) % media.length);
  const next = () => setMediaIndex((i) => (i + 1) % media.length);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/posts/${post.id}/comments`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setComments(data.comments ?? []);
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
    return () => controller.abort();
  }, [post.id]);

  const toggleLike = async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    const previousLiked = liked;
    setLiked((l) => !l);
    setLikeCount((c) => c + (previousLiked ? -1 : 1));
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
      onLiked(post.id, data.liked);
    } catch {
      setLiked(previousLiked);
      setLikeCount((c) => c + (previousLiked ? 1 : -1));
    } finally {
      setLikeBusy(false);
    }
  };

  const toggleSave = async () => {
    if (saveBusy) return;
    setSaveBusy(true);
    const previousSaved = saved;
    setSaved((s) => !s);
    setSavedCount((c) => c + (previousSaved ? -1 : 1));
    try {
      const res = await fetch(`/api/posts/${post.id}/save`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setSaved(data.saved);
      setSavedCount(data.savedCount);
      onSaved(post.id, data.saved);
    } catch {
      setSaved(previousSaved);
      setSavedCount((c) => c + (previousSaved ? 1 : -1));
    } finally {
      setSaveBusy(false);
    }
  };

  const postComment = async () => {
    const content = commentInput.trim();
    if (!content || commentPosting) return;
    setCommentPosting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setCommentInput("");
      onCommented(post.id, comments.length + 1);
      requestAnimationFrame(() => {
        if (commentsRef.current) {
          commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
        }
      });
    } catch {
      // silently fail
    } finally {
      setCommentPosting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        onCommented(post.id, Math.max(0, comments.length - 1));
      }
    } catch {
      // silently fail
    }
  };

  const authorName = post.author?.name || "You";
  const authorTag = post.author?.tag ? `@${post.author.tag}` : "";

  return (
    <AnimatePresence>
      {post && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="pointer-events-auto w-[50%] h-[70%] rounded-3xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="w-full h-14 flex items-center justify-between px-6 border-b border-border shrink-0">
                <p className="text-lg text-foreground font-semibold">Post</p>
                <motion.button
                  onClick={onClose}
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div className="w-full flex-1 flex overflow-hidden">
                <div className="relative flex-3 min-w-0 bg-black/40">
                  {current?.type === "video" ? (
                    <video src={current.url} className="w-full h-full object-contain" controls />
                  ) : current?.url ? (
                    <Image
                      src={current.url}
                      alt={post.caption || "Post"}
                      fill
                      sizes="30vw"
                      quality={100}
                      className="object-contain"
                    />
                  ) : null}
                  {media.length > 1 && (
                    <>
                      <button
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs">
                        {mediaIndex + 1}/{media.length}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex-2 min-w-0 flex flex-col border-l border-border">
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-shade-background flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                        {(authorName || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{authorName}</p>
                        {authorTag && <p className="text-xs text-muted-foreground truncate">{authorTag}</p>}
                      </div>
                    </div>
                    {post.mine && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={onEdit}
                          title="Edit post"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={onDelete}
                          title="Delete post"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div ref={commentsRef} className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-shade-background flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                          {(authorName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                            <span className="font-semibold mr-1">{authorName}</span>
                            <br />
                            {post.caption}
                          </p>
                          {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-x-1 mt-1">
                              {post.tags.map((tag, i) => (
                                <span key={`${tag}-${i}`} className="text-sm text-blue-500 leading-none">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {commentsLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 size={20} className="animate-spin text-muted-foreground" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-6">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-2 group">
                          <div className="w-8 h-8 rounded-full bg-shade-background flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                            {(comment.user.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                              <span className="font-semibold mr-1">{comment.user.name || "User"}</span>
                              <br />
                              {comment.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {comment.mine && (
                            <button
                              onClick={() => deleteComment(comment.id)}
                              title="Delete comment"
                              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity cursor-pointer shrink-0"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-5 py-3 border-t border-border flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <motion.button
                          onClick={toggleLike}
                          whileTap={{ scale: 0.8 }}
                          className="cursor-pointer"
                          title={liked ? "Unlike" : "Like"}
                        >
                          <Heart
                            size={24}
                            className={liked ? "text-red-500" : "text-foreground"}
                            fill={liked ? "currentColor" : "none"}
                          />
                        </motion.button>
                        <MessageCircle size={24} className="text-foreground" />
                        <motion.button
                          onClick={toggleSave}
                          whileTap={{ scale: 0.8 }}
                          className="cursor-pointer"
                          title={saved ? "Unsave" : "Save"}
                        >
                          <Bookmark
                            size={24}
                            className={saved ? "text-foreground" : "text-foreground"}
                            fill={saved ? "currentColor" : "none"}
                          />
                        </motion.button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{likeCount} likes</p>
                        <p className="text-xs text-muted-foreground">
                          {savedCount} saved · {post.commentCount} comments
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") postComment();
                        }}
                        className="flex-1 h-10 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                      <button
                        onClick={postComment}
                        disabled={!commentInput.trim() || commentPosting}
                        className="h-10 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        {commentPosting ? <Loader2 size={16} className="animate-spin" /> : "Post"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
