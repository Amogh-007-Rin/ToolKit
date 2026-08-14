"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ImageIcon, Video, X, Check, UploadCloud, AlignLeft, Hash, AlertCircle, Sparkles, GripVertical } from "lucide-react";
import { uploadFile } from "@/services/media";
import type { Post } from "@/types/posts";
import Spinner from "@/components/ui/loaders/Spinner";

interface EditPostCardProps {
  isOpen: boolean;
  post: Post;
  onClose: () => void;
  onSaved: () => void;
}

interface ExistingItem {
  kind: "existing";
  dbId: string;
  url: string;
  type: string;
}

interface NewItem {
  kind: "new";
  uploadId: string;
  key: string | null;
  type: string;
  previewUrl: string;
  progress: number;
  error: boolean;
}

type MediaItem = ExistingItem | NewItem;

const MAX_FILES = 10;

export default function EditPostCard({ isOpen, post, onClose, onSaved }: EditPostCardProps) {
  const [media, setMedia] = useState<MediaItem[]>(() =>
    post.media.map((m) => ({
      kind: "existing" as const,
      dbId: m.id,
      url: m.url,
      type: m.type,
    })),
  );
  const [caption, setCaption] = useState(post.caption);
  const [tags, setTags] = useState(post.tags.map((t) => `#${t}`).join(", "));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSeqRef = useRef(0);
  const reduceMotion = useReducedMotion();

  const close = () => {
    media.forEach((m) => {
      if (m.kind === "new") URL.revokeObjectURL(m.previewUrl);
    });
    setSubmitting(false);
    setError(null);
    onClose();
  };

  const updateNewItem = (uploadId: string, patch: Partial<NewItem>) => {
    setMedia((prev) =>
      prev.map((m) => (m.kind === "new" && m.uploadId === uploadId ? { ...m, ...patch } : m)),
    );
  };

  const startUpload = (file: File, uploadId: string) => {
    updateNewItem(uploadId, { progress: 0, error: false });
    uploadFile(file, "post", (fraction) => updateNewItem(uploadId, { progress: fraction }))
      .then(({ key, kind }) =>
        updateNewItem(uploadId, {
          key,
          type: kind === "video" ? "video" : "image",
          progress: 1,
        }),
      )
      .catch(() => updateNewItem(uploadId, { error: true }));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const incoming = Array.from(files);
    const videos = incoming.filter((f) => f.type.startsWith("video"));
    const images = incoming.filter((f) => f.type.startsWith("image"));

    if (videos.length + images.length !== incoming.length) {
      setError("Only images and videos are supported");
      return;
    }
    const existingVideo = media.some((m) => m.type === "video");
    const hasExisting = media.length > 0;
    if (videos.length > 1 || (videos.length === 1 && (images.length > 0 || hasExisting || existingVideo))) {
      setError("A post can contain multiple images or a single video");
      return;
    }
    if (existingVideo && images.length > 0) {
      setError("A post can contain multiple images or a single video");
      return;
    }
    if (media.length + incoming.length > MAX_FILES) {
      setError(`You can select up to ${MAX_FILES} files`);
      return;
    }

    const next: NewItem[] = [];
    for (const file of incoming) {
      const uploadId = `em-${uploadSeqRef.current++}`;
      const item: NewItem = {
        kind: "new",
        uploadId,
        key: null,
        type: file.type.startsWith("video") ? "video" : "image",
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        error: false,
      };
      next.push(item);
      startUpload(file, uploadId);
    }

    setMedia((prev) => [...prev, ...next]);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => {
      const target = prev[index];
      if (target?.kind === "new") URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDragOver = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setMedia((prev) => {
      const next = [...prev];
      [next[dragIndex], next[targetIndex]] = [next[targetIndex], next[dragIndex]];
      return next;
    });
    setDragIndex(targetIndex);
  };

  const uploadInProgress = media.some((m) => m.kind === "new" && !m.error && !m.key);

  const submit = async () => {
    if (media.length === 0 || submitting || uploadInProgress) return;

    setSubmitting(true);
    setError(null);

    const keptDbIds = new Set(
      media.filter((m) => m.kind === "existing").map((m) => m.dbId),
    );
    const removedMediaIds = post.media
      .map((m) => m.id)
      .filter((id) => !keptDbIds.has(id));

    const mediaOrder = media.map((m) =>
      m.kind === "existing"
        ? { id: m.dbId }
        : { key: m.key as string, type: m.type },
    );

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          tags: [
            ...new Set(
              tags
                .split(",")
                .map((t) => t.trim().replace(/^#/, ""))
                .filter(Boolean),
            ),
          ],
          removedMediaIds,
          media: mediaOrder,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update post");
      }
      onSaved();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setSubmitting(false);
    }
  };

  const hasVideo = media.some((m) => m.type === "video");
  const uploadOrSubmitting = submitting || uploadInProgress;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xl"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-none">
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 28, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 14, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 280, damping: 27, mass: 0.8 }}
              role="dialog" aria-modal="true" aria-label="Edit post"
              className="relative pointer-events-auto w-full max-w-2xl max-h-[92dvh] rounded-[26px] sm:rounded-[30px] bg-card/95 border border-white/12 shadow-[0_40px_120px_-24px_rgba(0,0,0,0.8)] ring-1 ring-black/10 flex flex-col overflow-hidden"
            >
              <div className="absolute -top-24 left-1/3 h-48 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
              <div className="relative w-full min-h-18 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/60 bg-card/75 backdrop-blur-2xl shrink-0">
                <div className="flex items-center gap-3"><div><p className="text-lg text-foreground font-semibold tracking-tight">Edit post</p><p className="text-xs text-muted-foreground">Refine your story and media</p></div></div>
                <motion.button
                  onClick={close}
                  whileHover={{ rotate: 90, scale: 1.08 }} whileTap={{ scale: 0.9 }}
                  className="grid h-9 w-9 place-items-center rounded-full bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Close edit post"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div data-lenis-prevent className="relative w-full flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6 thin-scrollbar">
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><UploadCloud size={16} className="text-primary" /> Media <span className="hidden sm:inline text-xs font-normal text-muted-foreground">· drag to reorder</span></div><span className="rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{media.length}/{MAX_FILES}</span></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <AnimatePresence mode="popLayout">
                      {media.map((m, i) => (
                        <motion.div layout
                          key={m.kind === "existing" ? m.dbId : m.uploadId}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: dragIndex === i ? 0.55 : 1, scale: dragIndex === i ? 0.96 : 1 }} exit={{ opacity: 0, scale: 0.85 }}
                          draggable
                          onDragStart={() => setDragIndex(i)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            handleDragOver(i);
                          }}
                          onDrop={(e) => e.preventDefault()}
                          onDragEnd={() => setDragIndex(null)}
                          className="group relative aspect-square rounded-2xl overflow-hidden bg-muted/30 border border-border/60 shadow-sm cursor-grab active:cursor-grabbing"
                        >
                          {m.type === "video" ? (
                            <video
                              src={m.kind === "existing" ? m.url : m.previewUrl}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <Image
                              src={m.kind === "existing" ? m.url : m.previewUrl}
                              alt={`Media ${i + 1}`}
                              fill
                              sizes="25vw"
                              quality={100}
                              className="object-cover"
                              unoptimized
                            />
                          )}
                          {m.kind === "existing" && (
                            <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/55 border border-white/10 backdrop-blur-md text-white text-[9px] uppercase tracking-wider font-semibold">
                              Published
                            </span>
                          )}
                          {m.kind === "new" && !m.key && !m.error && (
                            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col gap-2 items-center justify-center">
                              <Spinner size="sm" label={`Uploading media ${i + 1}`} /><p className="text-white text-xs font-semibold tabular-nums">{Math.round(m.progress * 100)}%</p>
                              <div className="h-1 w-16 overflow-hidden rounded-full bg-white/20"><motion.div className="h-full bg-white" animate={{ width: `${m.progress * 100}%` }} /></div>
                            </div>
                          )}
                          {m.kind === "new" && m.error && (
                            <div className="absolute inset-0 bg-destructive/70 backdrop-blur-sm flex flex-col gap-1 items-center justify-center">
                              <AlertCircle size={19} className="text-white" /><p className="text-white text-xs font-medium">Upload failed</p>
                            </div>
                          )}
                          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                            onClick={() => removeMedia(i)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/55 border border-white/15 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                            aria-label={`Remove media ${i + 1}`}
                          >
                            <X size={12} />
                          </motion.button>
                          <span className="absolute bottom-2 left-2 flex h-7 items-center gap-1 rounded-lg bg-black/55 border border-white/10 px-2 text-[10px] font-semibold text-white backdrop-blur-md"><GripVertical size={11} />{i + 1}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {media.length < MAX_FILES && !hasVideo && (
                      <motion.button layout whileHover={{ y: -2, borderColor: "rgba(157,111,254,0.7)" }} whileTap={{ scale: 0.98 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="group aspect-square rounded-2xl border border-dashed border-muted-foreground/35 bg-linear-to-br from-primary/6 to-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-sm ring-1 ring-border/60 transition-transform group-hover:-translate-y-1">{media.length === 0 ? <Video size={19} /> : <ImageIcon size={19} />}</span><span className="text-xs font-semibold">Add media</span><span className="text-[10px] opacity-70">Images or one video</span>
                      </motion.button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={onFileChange}
                    disabled={uploadInProgress}
                    className="hidden"
                  />
                </section>

                <section className="flex flex-col gap-2">
                  <div className="flex items-center justify-between"><label htmlFor="edit-caption" className="flex items-center gap-2 text-sm text-foreground font-semibold"><AlignLeft size={16} className="text-primary" /> Caption</label><span className="text-[11px] text-muted-foreground tabular-nums">{caption.length}/2200</span></div>
                  <textarea
                    id="edit-caption"
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    maxLength={2200}
                    className="w-full bg-input/60 border border-border/70 rounded-2xl px-4 py-3.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/8 transition-all resize-none"
                  />
                </section>

                <section className="flex flex-col gap-2">
                  <label htmlFor="edit-tags" className="flex items-center gap-2 text-sm text-foreground font-semibold"><Hash size={16} className="text-primary" /> Tags</label>
                  <input
                    id="edit-tags"
                    type="text"
                    placeholder="e.g. coding, design, tools (comma separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full h-12 bg-input/60 border border-border/70 rounded-2xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/8 transition-all"
                  />
                  <p className="text-[11px] text-muted-foreground">Separate tags with commas to help people find your post.</p>
                </section>

                <AnimatePresence>{error && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm text-destructive"><AlertCircle size={16} />{error}</motion.div>}</AnimatePresence>
              </div>

              <div className="w-full p-5 sm:p-6 border-t border-border/60 bg-card/75 backdrop-blur-2xl shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={submit}
                  disabled={media.length === 0 || uploadOrSubmitting}
                  className="w-full h-12 bg-linear-to-r from-primary to-[#b28aff] text-primary-foreground rounded-2xl font-semibold text-sm hover:brightness-105 disabled:opacity-45 disabled:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploadOrSubmitting ? <Spinner size="xs" label={submitting ? "Saving post" : "Uploading media"} /> : <Check size={18} />}
                  {submitting ? "Saving..." : uploadInProgress ? "Uploading..." : "Save changes"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
