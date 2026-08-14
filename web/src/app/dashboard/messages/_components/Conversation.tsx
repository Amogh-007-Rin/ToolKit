"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Paperclip, SendHorizontal, X } from "lucide-react";
import { timeAgo } from "@/lib/timeAgo";
import { uploadChatMedia, useMediaUrl } from "@/services/media";
import {
  type Attachment,
  type ConnStatus,
  type Contact,
  type Message,
  type RoomListItem,
} from "@/services/messaging";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

interface TempMessage {
  tempId: string;
  content: string;
  attachments: LocalMedia[];
  createdAt: string;
}

interface LocalMedia {
  key: string | null;
  kind: "image" | "video";
  name?: string | null;
  previewUrl: string;
}

export interface OutgoingMedia extends Attachment {
  previewUrl: string;
}

interface PendingMedia {
  id: string;
  kind: "image" | "video";
  name: string | null;
  previewUrl: string;
  key: string | null;
  progress: number;
  error: boolean;
}

function Avatar({ contact, size = 40 }: { contact?: Contact | null; size?: number }) {
  if (contact?.image) {
    return (
      <div
        className="rounded-full overflow-hidden shrink-0 relative"
        style={{ width: size, height: size }}
      >
        <Image
          src={contact.image}
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
      </div>
    );
  }
  const initials = (contact?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium shrink-0"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

function MediaThumb({
  url,
  kind,
  name,
}: {
  url: string;
  kind: "image" | "video";
  name?: string | null;
}) {
  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="rounded-xl w-full max-h-72 object-contain bg-black"
      />
    );
  }
  return (
    <Image
      src={url}
      alt={name ?? ""}
      width={640}
      height={480}
      unoptimized
      loading="eager"
      className="rounded-xl w-full max-h-72 object-cover bg-muted"
    />
  );
}

function MediaShell({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className={`mb-1.5 ${count > 1 ? "grid grid-cols-2 gap-1.5 max-w-80" : "max-w-72"}`}>
      {children}
    </div>
  );
}

function RemoteMedia({
  attachment,
  onView,
}: {
  attachment: Attachment;
  onView?: (url: string, kind: "image" | "video") => void;
}) {
  const url = useMediaUrl(attachment.key);
  if (!url) {
    return (
      <div className="rounded-xl bg-muted w-full h-32 flex items-center justify-center text-xs text-muted-foreground">
        Media unavailable
      </div>
    );
  }
  const content = (
    <MediaThumb url={url} kind={attachment.kind} name={attachment.name} />
  );
  if (!onView) return content;
  return (
    <button
      onClick={() => onView(url, attachment.kind)}
      className="cursor-pointer w-full text-left"
    >
      {content}
    </button>
  );
}

function Bubble({
  mine,
  children,
  meta,
  media,
}: {
  mine: boolean;
  children: string;
  meta?: string;
  media?: ReactNode;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
          mine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        }`}
      >
        {media ? <div className="pt-1">{media}</div> : null}
        {children ? <p className="whitespace-pre-wrap wrap-break-words">{children}</p> : null}
        {meta ? (
          <p className={`text-xs mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {meta}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" role="status" aria-label="Typing">
      <div className="px-4 py-4 rounded-2xl bg-muted rounded-bl-md flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export default function Conversation({
  room,
  contact,
  meId,
  messages,
  tempMessages,
  typingUsers,
  error,
  onlineUsers,
  lastSeenMap,
  onSend,
  onTypingChange,
}: {
  room: RoomListItem | null;
  contact?: Contact | null;
  meId: string;
  messages: Message[];
  tempMessages: TempMessage[];
  typingUsers: string[];
  status: ConnStatus;
  error: string | null;
  onlineUsers: Set<string>;
  lastSeenMap: Record<string, string>;
  onSend: (content: string, attachments: OutgoingMedia[]) => void;
  onTypingChange: (typing: boolean, roomId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [viewer, setViewer] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingStopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);
  const typingActiveRef = useRef(false);
  const uploadSeqRef = useRef(0);
  const pendingRef = useRef<PendingMedia[]>([]);
  const router = useRouter();

  const otherUserId = contact?.id;
  const isOtherOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
  const lastSeenAt = otherUserId ? lastSeenMap[otherUserId] : null;

  let presenceLabel = "Offline";
  if (isOtherOnline) {
    presenceLabel = "Online";
  } else if (lastSeenAt && now !== null) {
    const secondsAgo = Math.max(
      0,
      (now - new Date(lastSeenAt).getTime()) / 1000,
    );
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 1) {
      presenceLabel = "Last seen just now";
    } else if (minutesAgo < 30) {
      presenceLabel = `Last seen ${minutesAgo} min ago`;
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, tempMessages, typingUsers]);

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const sendTyping = useCallback(
    (typing: boolean) => {
      if (typing === typingActiveRef.current) {
        return;
      }
      typingActiveRef.current = typing;
      if (room) {
        onTypingChange(typing, room.id);
      }
    },
    [room, onTypingChange],
  );

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current !== null) {
        window.clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      typingActiveRef.current = false;
      sendTyping(false);
    };
  }, [sendTyping]);

  const notifyTyping = () => {
    sendTyping(true);
    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
    }
    typingStopTimerRef.current = window.setTimeout(() => {
      typingStopTimerRef.current = null;
      sendTyping(false);
    }, 2500);
  };

  const stopTyping = () => {
    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    sendTyping(false);
  };

  const updatePending = useCallback((id: string, patch: Partial<PendingMedia>) => {
    setPending((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const startUpload = useCallback(
    (file: File, roomId: string, id: string) => {
      updatePending(id, { progress: 0, error: false });
      uploadChatMedia(file, roomId, (fraction) => updatePending(id, { progress: fraction }))
        .then((attachment) => updatePending(id, { key: attachment.key, progress: 1 }))
        .catch(() => updatePending(id, { error: true }));
    },
    [updatePending],
  );

  const addFiles = (files: File[]) => {
    if (!room) {
      return;
    }
    const next: PendingMedia[] = [];
    const uploads: { file: File; id: string }[] = [];
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        continue;
      }
      const id = `up-${uploadSeqRef.current++}`;
      next.push({
        id,
        kind: isVideo ? "video" : "image",
        name: file.name || null,
        previewUrl: URL.createObjectURL(file),
        key: null,
        progress: 0,
        error: false,
      });
      uploads.push({ file, id });
    }
    if (next.length === 0) {
      return;
    }
    setPending((prev) => [...prev, ...next]);
    for (const { file, id } of uploads) {
      startUpload(file, room.id, id);
    }
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    const ready = pending.filter((item) => !item.error && item.key);
    if (!content && ready.length === 0) {
      return;
    }
    if (pending.some((item) => !item.error && !item.key)) {
      return;
    }
    stopTyping();
    onSend(
      content,
      ready.map((item) => ({
        key: item.key as string,
        kind: item.kind,
        name: item.name,
        previewUrl: item.previewUrl,
      })),
    );
    setDraft("");
    pending.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setPending([]);
  };

  if (!room) {
    return (
      <section className="flex-1 h-full bg-card rounded-3xl flex items-center justify-center">
        <p className="text-muted-foreground">Select a conversation to start messaging</p>
      </section>
    );
  }

  const uploading = pending.some((item) => !item.error && !item.key);
  const sendDisabled = (!draft.trim() && pending.length === 0) || uploading;

  return (
    <>
      <section className="flex-1 h-full bg-card rounded-3xl flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border">
        {contact?.tag ? (
          <button
            onClick={() => router.push(`/profile/${contact.tag}`)}
            className="shrink-0 cursor-pointer"
            aria-label={`View ${contact.name ?? contact.tag}'s profile`}
          >
            <Avatar contact={contact} size={40} />
          </button>
        ) : (
          <Avatar contact={contact} size={40} />
        )}
        <div className="flex flex-col min-w-0">
          <p className="text-foreground font-semibold truncate">
            {contact?.name ?? contact?.tag ?? "Unknown user"}
          </p>
          <p className={`text-xs ${isOtherOnline ? "text-green-500" : "text-muted-foreground"}`}>
            {presenceLabel}
          </p>
        </div>
      </header>

      <div ref={scrollRef} data-lenis-prevent className="flex-1 overflow-y-auto p-5 flex flex-col gap-2.5">
        {error ? (
          <p className="text-destructive text-sm bg-destructive/10 rounded-xl px-4 py-2">
            {error}
          </p>
        ) : null}
        {messages.map((message) => (
          <Bubble
            key={message.id}
            mine={message.senderId === meId}
            meta={timeAgo(message.createdAt)}
            media={
              message.attachments.length > 0 ? (
                <MediaShell count={message.attachments.length}>
                  {message.attachments.map((attachment) => (
                    <RemoteMedia
                      key={attachment.key}
                      attachment={attachment}
                      onView={(url, kind) => setViewer({ url, kind })}
                    />
                  ))}
                </MediaShell>
              ) : undefined
            }
          >
            {message.content}
          </Bubble>
        ))}
        {tempMessages.map((temp) => (
          <Bubble
            key={temp.tempId}
            mine
            meta={`sending…`}
            media={
              temp.attachments.length > 0 ? (
                <MediaShell count={temp.attachments.length}>
                  {temp.attachments.map((attachment) => (
                    <button
                      key={attachment.key ?? attachment.previewUrl}
                      onClick={() =>
                        setViewer({
                          url: attachment.previewUrl,
                          kind: attachment.kind,
                        })
                      }
                      className="cursor-pointer w-full text-left"
                    >
                      <MediaThumb
                        url={attachment.previewUrl}
                        kind={attachment.kind}
                        name={attachment.name}
                      />
                    </button>
                  ))}
                </MediaShell>
              ) : undefined
            }
          >
            {temp.content}
          </Bubble>
        ))}
        {typingUsers.length > 0 ? <TypingIndicator /> : null}
      </div>

      <form onSubmit={submit} className="p-4 border-t border-border flex flex-col gap-3">
        {pending.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pending.map((item) => (
              <div
                key={item.id}
                className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted"
              >
                {item.kind === "video" ? (
                  <video
                    src={item.previewUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <Image
                    src={item.previewUrl}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                )}
                {!item.key && !item.error ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <p className="text-[10px] text-white">
                      {Math.round(item.progress * 100)}%
                    </p>
                  </div>
                ) : null}
                {item.error ? (
                  <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center">
                    <p className="text-[10px] text-white">Failed</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => removePending(item.id)}
                  aria-label="Remove attachment"
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-muted text-muted-foreground rounded-full w-11 h-11 flex items-center justify-center cursor-pointer hover:text-foreground transition-colors"
            aria-label="Attach media"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              notifyTyping();
            }}
            onBlur={stopTyping}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(event);
              }
            }}
            rows={1}
            placeholder="Type a message…"
            className="flex-1 resize-none bg-input rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={sendDisabled}
            className="bg-primary text-primary-foreground rounded-full w-11 h-11 flex items-center justify-center cursor-pointer disabled:opacity-50"
            aria-label="Send message"
          >
            <SendHorizontal size={20} />
          </button>
        </div>
      </form>
      </section>
      {viewer ? (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setViewer(null)}
          role="dialog"
          aria-label="Media viewer"
        >
          <button
            onClick={() => setViewer(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors z-10"
            aria-label="Close viewer"
          >
            <X size={24} />
          </button>
          <div
            className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {viewer.kind === "video" ? (
              <video
                src={viewer.url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-xl"
              />
            ) : (
              <Image
                src={viewer.url}
                alt=""
                width={1200}
                height={900}
                unoptimized
                className="max-w-full max-h-[90vh] object-contain rounded-xl"
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
