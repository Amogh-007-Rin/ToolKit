"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  Sparkles,
} from "lucide-react";
import Spinner from "@/components/ui/loaders/Spinner";
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

function UserAvatar({ image, name }: { image: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <motion.div
        whileHover={{ scale: 1.08 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        className="relative w-9 h-9 rounded-full shrink-0 p-0.5 bg-linear-to-br from-primary/80 via-primary/20 to-transparent"
      >
        <Image
          src={image}
          alt={`${name} avatar`}
          width={36}
          height={36}
          unoptimized
          className="w-full h-full rounded-full object-cover border-2 border-card"
          onError={() => setFailed(true)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      className="w-9 h-9 rounded-full bg-linear-to-br from-primary/25 to-shade-background border border-primary/15 flex items-center justify-center text-sm font-semibold text-foreground shrink-0"
    >
      {(name || "U").charAt(0).toUpperCase()}
    </motion.div>
  );
}

const easeOut = [0.22, 1, 0.36, 1] as const;

function Count({ value }: { value: number }) {
  return (
    <span className="relative inline-flex h-5 min-w-3 overflow-hidden align-middle">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -12, opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.2, ease: easeOut }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
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
  const [mediaDirection, setMediaDirection] = useState(1);
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
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const commentsRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  const media = post.media;
  const current = media[mediaIndex];
  const selectMedia = (index: number, direction?: number) => {
    setMediaDirection(direction ?? (index > mediaIndex ? 1 : -1));
    setMediaIndex(index);
  };
  const prev = () => selectMedia((mediaIndex - 1 + media.length) % media.length, -1);
  const next = () => selectMedia((mediaIndex + 1) % media.length, 1);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft" && media.length > 1) prev();
      if (event.key === "ArrowRight" && media.length > 1) next();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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
      setCommentCount((count) => count + 1);
      onCommented(post.id, commentCount + 1);
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
        setCommentCount((count) => Math.max(0, count - 1));
        onCommented(post.id, Math.max(0, commentCount - 1));
      }
    } catch {
      // silently fail
    }
  };

  const authorName = post.author?.name || "You";
  const authorTag = post.author?.tag ? `@${post.author.tag}` : "";
  const authorImage = post.author?.image ?? null;

  return (
    <AnimatePresence>
      {post && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xl"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 lg:p-8 pointer-events-none">
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 28, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 14, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 280, damping: 26, mass: 0.8 }}
              role="dialog"
              aria-modal="true"
              aria-label="Post details"
              className="relative pointer-events-auto w-full max-w-6xl h-[min(94dvh,820px)] rounded-[22px] sm:rounded-[30px] bg-card/95 border border-white/12 shadow-[0_40px_120px_-24px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden ring-1 ring-black/10"
            >
              <div className="absolute -top-24 left-1/3 h-48 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
              <div className="relative w-full h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border/60 bg-card/75 backdrop-blur-2xl shrink-0">
                <div className="flex items-center gap-3">
                  <motion.span
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.12, duration: 0.4, ease: easeOut }}
                    className="w-1 h-7 rounded-full bg-linear-to-b from-primary via-primary to-primary/20 shadow-[0_0_18px_rgba(157,111,254,0.6)]"
                  />
                  <div>
                    <p className="text-base text-foreground font-semibold tracking-tight">Post details</p>
                    <p className="hidden sm:block text-[11px] text-muted-foreground">Shared by {authorName}</p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  whileHover={{ rotate: 90, scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="w-9 h-9 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close post details"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div className="relative w-full flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="relative h-[38%] sm:h-[48%] lg:h-auto flex-none lg:flex-[1.35] min-h-0 bg-[#070708] overflow-hidden isolate">
                  {current?.type !== "video" && current?.url && (
                    <motion.div
                      key={`ambient-${current.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      className="absolute -inset-8 blur-3xl scale-110"
                    >
                      <Image src={current.url} alt="" fill sizes="60vw" unoptimized className="object-cover" />
                    </motion.div>
                  )}
                  <div className="absolute inset-0 bg-black/25 backdrop-blur-2xl pointer-events-none" />
                  <div className="absolute inset-0 bg-radial-[circle_at_center] from-white/8 via-transparent to-black/25 pointer-events-none" />
                  <AnimatePresence mode="popLayout" initial={false} custom={mediaDirection}>
                    <motion.div
                      key={`${current?.id ?? "media"}-${mediaIndex}`}
                      custom={mediaDirection}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: mediaDirection * 42, scale: 0.985, filter: "blur(5px)" }}
                      animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: mediaDirection * -30, scale: 0.99, filter: "blur(4px)" }}
                      transition={{ duration: 0.4, ease: easeOut }}
                      className="absolute inset-0 z-10"
                    >
                    {current?.type === "video" ? (
                      <video src={current.url} className="w-full h-full object-contain" controls />
                    ) : current?.url ? (
                      <Image
                        src={current.url}
                        alt={post.caption || "Post"}
                        fill
                        sizes="30vw"
                        quality={100}
                        unoptimized
                        className="object-contain"
                      />
                    ) : null}
                    </motion.div>
                  </AnimatePresence>
                  {media.length > 1 && (
                    <>
                      <motion.button
                        onClick={prev}
                        whileHover={{ scale: 1.1, x: -2 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute z-20 left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 border border-white/15 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors shadow-lg"
                        aria-label="Previous media"
                      >
                        <ChevronLeft size={18} />
                      </motion.button>
                      <motion.button
                        onClick={next}
                        whileHover={{ scale: 1.1, x: 2 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute z-20 right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 border border-white/15 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors shadow-lg"
                        aria-label="Next media"
                      >
                        <ChevronRight size={18} />
                      </motion.button>
                      <span className="absolute z-20 top-3 right-3 px-2.5 py-1 rounded-full bg-black/45 border border-white/10 backdrop-blur-md text-white text-xs font-medium tabular-nums">
                        {mediaIndex + 1}/{media.length}
                      </span>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="absolute z-20 bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 rounded-2xl border border-white/10 bg-black/45 p-1.5 backdrop-blur-xl"
                      >
                        {media.map((item, index) => (
                          <motion.button
                            key={item.id}
                            onClick={() => selectMedia(index)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.92 }}
                            aria-label={`View media ${index + 1}`}
                            aria-current={index === mediaIndex}
                            className={`relative h-9 w-9 overflow-hidden rounded-xl border transition-colors cursor-pointer ${index === mediaIndex ? "border-white shadow-[0_0_0_2px_rgba(157,111,254,0.7)]" : "border-white/10 opacity-60 hover:opacity-100"}`}
                          >
                            {item.type === "video" ? (
                              <video src={item.url} muted className="h-full w-full object-cover" />
                            ) : (
                              <Image src={item.url} alt="" fill sizes="36px" unoptimized className="object-cover" />
                            )}
                          </motion.button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </div>

                <div className="flex-1 min-w-0 min-h-0 flex flex-col border-t lg:border-t-0 lg:border-l border-border/60 bg-linear-to-b from-card via-card to-muted/15">
                  <div className="px-4 sm:px-5 py-3.5 border-b border-border/60 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar image={authorImage} name={authorName} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{authorName}</p>
                        {authorTag && <p className="text-xs text-muted-foreground truncate">{authorTag}</p>}
                      </div>
                    </div>
                    {post.mine && (
                      <div className="flex items-center gap-1 shrink-0">
                        <motion.button
                          onClick={onEdit}
                          whileHover={{ y: -2, scale: 1.04 }}
                          whileTap={{ scale: 0.92 }}
                          title="Edit post"
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer hover:-translate-y-0.5"
                        >
                          <Pencil size={16} />
                        </motion.button>
                        <motion.button
                          onClick={onDelete}
                          whileHover={{ y: -2, scale: 1.04 }}
                          whileTap={{ scale: 0.92 }}
                          title="Delete post"
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer hover:-translate-y-0.5"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    )}
                  </div>

                  <div ref={commentsRef} data-lenis-prevent className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-4 thin-scrollbar">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 }}
                      className="relative flex flex-col gap-1 rounded-2xl bg-linear-to-br from-primary/8 via-muted/25 to-muted/10 border border-primary/10 p-3.5 overflow-hidden"
                    >
                      <div className="flex items-start gap-2">
                        <UserAvatar image={authorImage} name={authorName} />
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
                    </motion.div>

                    {commentsLoading ? (
                      <div className="flex flex-col gap-3 py-2" aria-label="Loading comments">
                        {[0, 1].map((item) => (
                          <motion.div
                            key={item}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.35, 0.7, 0.35] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: item * 0.15 }}
                            className="flex items-center gap-3"
                          >
                            <div className="h-9 w-9 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                              <div className="h-2.5 w-1/3 rounded-full bg-muted" />
                              <div className="h-2.5 w-4/5 rounded-full bg-muted" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : comments.length === 0 ? (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => commentInputRef.current?.focus()}
                        className="group mx-auto flex flex-col items-center gap-2 rounded-2xl px-6 py-5 text-center cursor-pointer"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-theme-button-insider/5 text-primary transition-transform group-hover:-translate-y-1">
                          <MessageCircle size={18} className="text-foreground"/>
                        </span>
                        <span className="text-sm font-medium text-foreground">Start the conversation</span>
                        <span className="text-xs text-muted-foreground">Be the first to leave a thought.</span>
                      </motion.button>
                    ) : (
                      comments.map((comment, index) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 16, height: 0 }}
                          transition={{ delay: Math.min(index * 0.035, 0.25), duration: 0.24 }}
                          layout
                          className="flex items-start gap-2.5 group rounded-xl px-1 py-1"
                        >
                          <UserAvatar
                            image={comment.user.image}
                            name={comment.user.name || "User"}
                          />
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
                        </motion.div>
                      ))
                    )}
                  </div>

                  <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-border/60 bg-card/80 backdrop-blur-2xl flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={toggleLike}
                          whileHover={{ y: -2, scale: 1.04 }}
                          whileTap={{ scale: 0.86 }}
                          animate={liked ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                          disabled={likeBusy}
                          className={`relative w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors disabled:cursor-wait ${liked ? "bg-red-500/12" : "hover:bg-muted"}`}
                          title={liked ? "Unlike" : "Like"}
                        >
                          <Heart
                            size={24}
                            className={liked ? "text-red-500" : "text-foreground"}
                            fill={liked ? "currentColor" : "none"}
                          />
                        </motion.button>
                        <motion.button
                          whileHover={{ y: -2, scale: 1.04 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => commentInputRef.current?.focus()}
                          aria-label="Write a comment"
                          className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
                        >
                          <MessageCircle size={23} className="text-foreground" />
                        </motion.button>
                        <motion.button
                          onClick={toggleSave}
                          whileHover={{ y: -2, scale: 1.04 }}
                          whileTap={{ scale: 0.86 }}
                          animate={saved ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                          disabled={saveBusy}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors disabled:cursor-wait ${saved ? "bg-primary/12" : "hover:bg-muted"}`}
                          title={saved ? "Unsave" : "Save"}
                        >
                          <Bookmark
                            size={24}
                            className={saved ? "text-foreground" : "text-foreground"}
                            fill={saved ? "currentColor" : "none"}
                          />
                        </motion.button>
                      </div>
                      <div className="text-right rounded-xl border border-border/50 bg-muted/30 px-3 py-1.5 tabular-nums">
                        <p className="text-sm font-semibold text-foreground"><Count value={likeCount} /> likes</p>
                        <p className="text-xs text-muted-foreground">
                          <Count value={savedCount} /> saved · <Count value={commentCount} /> comments
                        </p>
                      </div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 }}
                      className="flex items-center gap-2 rounded-2xl bg-input/70 border border-border px-2 py-1.5 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/8 transition-all"
                    >
                      <input
                        ref={commentInputRef}
                        type="text"
                        placeholder="Add a comment..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") postComment();
                        }}
                        className="flex-1 h-9 min-w-0 bg-transparent px-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
                      />
                      <motion.button
                        onClick={postComment}
                        disabled={!commentInput.trim() || commentPosting}
                        whileHover={commentInput.trim() ? { scale: 1.03 } : undefined}
                        whileTap={commentInput.trim() ? { scale: 0.95 } : undefined}
                        aria-label="Post comment"
                        className="h-9 min-w-9 px-3 sm:px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-[0_8px_24px_-8px_rgba(157,111,254,0.8)] hover:bg-primary/90 disabled:opacity-40 disabled:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {commentPosting ? <Spinner size="xs" label="Posting comment" /> : <><Send size={14} /><span className="hidden sm:inline">Comment</span></>}
                      </motion.button>
                    </motion.div>
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
