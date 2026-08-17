"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ImageIcon, Video, X, Check, UploadCloud, AlignLeft, Hash, AlertCircle } from "lucide-react";
import { uploadFile } from "@/services/media";
import Spinner from "@/components/ui/loaders/Spinner";

interface MakePostCardProps {
  isOpen: boolean;
  onClose: () => void;
  onPosted: () => void;
}

interface PendingMedia {
  id: string;
  type: string;
  previewUrl: string;
  key: string | null;
  progress: number;
  error: boolean;
}

const MAX_FILES = 10;

export default function MakePostCard({ isOpen, onClose, onPosted }: MakePostCardProps) {
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSeqRef = useRef(0);
  const reduceMotion = useReducedMotion();

  const reset = () => {
    media.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    setMedia([]);
    setCaption("");
    setTags("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const updateItem = (id: string, patch: Partial<PendingMedia>) => {
    setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const startUpload = (file: File, id: string) => {
    updateItem(id, { progress: 0, error: false });
    uploadFile(file, "post", (fraction) => updateItem(id, { progress: fraction }))
      .then(({ key, kind }) => updateItem(id, { key, type: kind === "video" ? "video/mp4" : "image/jpeg", progress: 1 }))
      .catch(() => updateItem(id, { error: true }));
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
    const existingVideo = media.some((m) => m.type.startsWith("video"));
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

    const next: PendingMedia[] = [];
    for (const file of incoming) {
      const id = `pm-${uploadSeqRef.current++}`;
      next.push({
        id,
        type: file.type,
        previewUrl: URL.createObjectURL(file),
        key: null,
        progress: 0,
        error: false,
      });
      startUpload(file, id);
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
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadInProgress = media.some((m) => !m.error && !m.key);
  const readyMedia = media.filter((m) => m.key && !m.error);
  const captionLength = caption.length;

  const submit = async () => {
    if (media.length === 0 || submitting || uploadInProgress) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
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
          media: readyMedia.map((m, i) => ({
            key: m.key as string,
            type: m.type.startsWith("video") ? "video" : "image",
            order: i,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create post");
      }
      close();
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

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
              role="dialog"
              aria-modal="true"
              aria-label="Create new post"
              className="relative pointer-events-auto w-full max-w-2xl max-h-[92dvh] rounded-[26px] sm:rounded-[30px] bg-card/95 border border-white/12 shadow-[0_40px_120px_-24px_rgba(0,0,0,0.8)] ring-1 ring-black/10 flex flex-col overflow-hidden"
            >
              <div className="relative w-full min-h-18 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/60 bg-card/75 backdrop-blur-2xl shrink-0">
                <div className="flex items-center gap-3">
                  <div><p className="text-lg text-foreground font-semibold tracking-tight">Create new post</p><p className="text-xs text-muted-foreground">Share something worth discovering</p></div>
                </div>
                <motion.button
                  onClick={close}
                  whileHover={{ rotate: 90, scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  className="grid h-9 w-9 place-items-center rounded-full bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Close create post"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div data-lenis-prevent className="relative w-full flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6 thin-scrollbar">
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><UploadCloud size={16} className="text-primary" /> Media</div><span className="rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{media.length}/{MAX_FILES}</span></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <AnimatePresence mode="popLayout">
                    {media.map((m, i) => (
                      <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} key={m.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-muted/30 border border-border/60 shadow-sm">
                        {m.type.startsWith("video") ? (
                          <video src={m.previewUrl} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <Image
                            src={m.previewUrl}
                            alt={`Selected media ${i + 1}`}
                            fill
                            sizes="25vw"
                            quality={100}
                            className="object-cover"
                            unoptimized
                          />
                        )}
                        {!m.key && !m.error ? (
                          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col gap-2 items-center justify-center">
                            <Spinner size="sm" label={`Uploading media ${i + 1}`} /><p className="text-white text-xs font-semibold tabular-nums">{Math.round(m.progress * 100)}%</p>
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-white/20"><motion.div className="h-full bg-white" animate={{ width: `${m.progress * 100}%` }} /></div>
                          </div>
                        ) : m.error ? (
                          <div className="absolute inset-0 bg-destructive/70 backdrop-blur-sm flex flex-col gap-1 items-center justify-center">
                            <AlertCircle size={19} className="text-white" /><p className="text-white text-xs font-medium">Upload failed</p>
                          </div>
                        ) : null}
                        <motion.button
                          onClick={() => removeMedia(i)}
                          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/55 border border-white/15 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label={`Remove media ${i + 1}`}
                        >
                          <X size={12} />
                        </motion.button>
                        <span className="absolute bottom-2 left-2 grid h-6 min-w-6 place-items-center rounded-lg bg-black/55 px-1.5 text-[10px] font-semibold text-white backdrop-blur-md">{i + 1}</span>
                      </motion.div>
                    ))}
                    </AnimatePresence>
                    {media.length < MAX_FILES && !media.some((m) => m.type.startsWith("video")) && (
                      <motion.button layout whileHover={{ y: -2, borderColor: "rgba(157,111,254,0.7)" }} whileTap={{ scale: 0.98 }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`group aspect-square rounded-2xl border border-dashed border-muted-foreground/35 bg-linear-to-br from-primary/6 to-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer ${media.length === 0 ? "col-span-2 sm:col-span-3 w-full max-w-48 justify-self-center" : ""}`}
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-sm ring-1 ring-border/60 transition-transform group-hover:-translate-y-1">{media.length === 0 ? <Video size={19} /> : <ImageIcon size={19} />}</span>
                        <span className="text-xs font-semibold">Add media</span><span className="text-[10px] opacity-70">Images or one video</span>
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
                  <div className="flex items-center justify-between"><label htmlFor="create-caption" className="flex items-center gap-2 text-sm text-foreground font-semibold"><AlignLeft size={16} className="text-primary" /> Caption</label><span className="text-[11px] text-muted-foreground tabular-nums">{captionLength}/2200</span></div>
                  <textarea
                    id="create-caption"
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    maxLength={2200}
                    className="w-full bg-input/60 border border-border/70 rounded-2xl px-4 py-3.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/8 transition-all resize-none"
                  />
                </section>

                <section className="flex flex-col gap-2">
                  <label htmlFor="create-tags" className="flex items-center gap-2 text-sm text-foreground font-semibold"><Hash size={16} className="text-primary" /> Tags</label>
                  <input
                    id="create-tags"
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
                  disabled={media.length === 0 || submitting || uploadInProgress}
                  className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm hover:brightness-105 disabled:opacity-45 disabled:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting || uploadInProgress ? <Spinner size="xs" label={submitting ? "Sharing post" : "Uploading media"} /> : <Check size={18} />}
                  {submitting ? "Sharing..." : uploadInProgress ? "Uploading..." : "Share"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
