"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Video, X, Check, Loader2 } from "lucide-react";
import { uploadFile } from "@/services/media";
import type { Post } from "@/types/posts";

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
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="pointer-events-auto w-[70%] max-w-2xl max-h-[85vh] rounded-3xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="w-full h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
                <p className="text-xl text-foreground font-semibold">Edit post</p>
                <motion.button
                  onClick={close}
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div className="w-full flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-muted-foreground font-medium">
                    Media — drag to reorder
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {media.map((m, i) => (
                      <div
                        key={m.kind === "existing" ? m.dbId : m.uploadId}
                        draggable
                        onDragStart={() => setDragIndex(i)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          handleDragOver(i);
                        }}
                        onDrop={(e) => e.preventDefault()}
                        onDragEnd={() => setDragIndex(null)}
                        className={`relative aspect-square rounded-xl overflow-hidden bg-muted/30 cursor-grab active:cursor-grabbing ${
                          dragIndex === i ? "opacity-50" : ""
                        }`}
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
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px]">
                            existing
                          </span>
                        )}
                        {m.kind === "new" && !m.key && !m.error && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <p className="text-white text-xs font-medium">
                              {Math.round(m.progress * 100)}%
                            </p>
                          </div>
                        )}
                        {m.kind === "new" && m.error && (
                          <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center">
                            <p className="text-white text-xs">Upload failed</p>
                          </div>
                        )}
                        <button
                          onClick={() => removeMedia(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
                        >
                          <X size={12} />
                        </button>
                        <span className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-md bg-black/60 text-white text-[10px] flex items-center justify-center">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                    {media.length < MAX_FILES && !hasVideo && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                      >
                        {media.length === 0 ? <Video size={20} /> : <ImageIcon size={20} />}
                        <span className="text-xs">Add media</span>
                      </button>
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
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted-foreground font-medium">Caption</label>
                  <textarea
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    maxLength={2200}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted-foreground font-medium">Tags</label>
                  <input
                    type="text"
                    placeholder="e.g. coding, design, tools (comma separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>

              <div className="w-full p-6 pt-0 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={submit}
                  disabled={media.length === 0 || uploadOrSubmitting}
                  className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploadOrSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
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
