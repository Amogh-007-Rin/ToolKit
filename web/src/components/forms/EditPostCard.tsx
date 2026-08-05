"use client";

import { useState, useRef, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Video, X, Check, Loader2 } from "lucide-react";
import type { Post } from "@/types/posts";

interface EditPostCardProps {
  isOpen: boolean;
  post: Post;
  onClose: () => void;
  onSaved: () => void;
}

interface SelectedMedia {
  url: string;
  type: string;
  isNew: boolean;
  dbId?: string;
}

const MAX_FILES = 10;

export default function EditPostCard({ isOpen, post, onClose, onSaved }: EditPostCardProps) {
  const [media, setMedia] = useState<SelectedMedia[]>(() =>
    post.media.map((m) => ({ url: m.url, type: m.type === "video" ? "video/mp4" : "image/jpeg", isNew: false, dbId: m.id }))
  );
  const [caption, setCaption] = useState(post.caption);
  const [tags, setTags] = useState(post.tags.map((t) => `#${t}`).join(", "));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setSubmitting(false);
    setError(null);
    onClose();
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
    if (videos.length > 1 || (videos.length === 1 && images.length > 0)) {
      setError("A post can contain multiple images or a single video");
      return;
    }
    if (media.length + incoming.length > MAX_FILES) {
      setError(`You can select up to ${MAX_FILES} files`);
      return;
    }

    setMedia((prev) => [
      ...prev,
      ...incoming.map((f) => ({ url: URL.createObjectURL(f), type: f.type, isNew: true })),
    ]);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (media.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);
    const formData = new FormData();
    for (const m of media) {
      if (!m.isNew) continue;
      const blob = await fetch(m.url).then((r) => r.blob());
      const isVideo = m.type.startsWith("video");
      formData.append("files", new File([blob], `media-${Date.now()}.${isVideo ? "video" : "image"}`, { type: m.type }));
    }
    const keptDbIds = new Set(media.filter((m) => !m.isNew && m.dbId).map((m) => m.dbId!));
    formData.append("removedMediaIds", JSON.stringify(post.media.map((m) => m.id).filter((id) => !keptDbIds.has(id))));
    formData.append("caption", caption);
    formData.append(
      "tags",
      JSON.stringify(
        [
          ...new Set(
            tags
              .split(",")
              .map((t) => t.trim().replace(/^#/, ""))
              .filter(Boolean)
          ),
        ]
      )
    );

    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "PATCH", body: formData });
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
                    Media — multiple images or a single video
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {media.map((m, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted/30">
                        {m.type.startsWith("video") ? (
                          <video src={m.url} className="w-full h-full object-cover" muted />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                        )}
                        {!m.isNew && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px]">
                            existing
                          </span>
                        )}
                        <button
                          onClick={() => removeMedia(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {media.length < MAX_FILES && !media.some((m) => m.type.startsWith("video")) && (
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
                  disabled={media.length === 0 || submitting}
                  className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {submitting ? "Saving..." : "Save changes"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
