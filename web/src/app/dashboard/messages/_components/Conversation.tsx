"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { ArrowLeft, Camera, MoreVertical, Paperclip, Phone, SendHorizontal, Smile, X } from "lucide-react";
import { useTheme } from "next-themes";
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

function dayKey(dateLike: string): string {
  const date = new Date(dateLike);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(dateLike: string): string {
  const date = new Date(dateLike);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  onBack,
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
  onBack?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [viewer, setViewer] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { resolvedTheme } = useTheme();
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
      <section className="message-empty-state flex h-full flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-border/70 bg-sidebar/65 p-6 text-center shadow-sm backdrop-blur-xl">
        <div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <SendHorizontal size={22} />
          </div>
          <p className="font-semibold text-foreground">Select a conversation</p>
          <p className="mt-1 text-sm text-muted-foreground">Choose someone to start messaging.</p>
        </div>
      </section>
    );
  }

  const uploading = pending.some((item) => !item.error && !item.key);
  const sendDisabled = (!draft.trim() && pending.length === 0) || uploading;

  return (
    <>
      <section className="message-conversation relative flex h-full flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/65 shadow-sm backdrop-blur-xl">
      <header className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/75 px-3 py-2.5 shadow-sm backdrop-blur-xl">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {contact?.name ?? contact?.tag ?? "Unknown user"}
          </p>
          <p className={`mt-0.5 text-[11px] ${isOtherOnline ? "text-green-500" : "text-muted-foreground"}`}>
            {presenceLabel}
          </p>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <button className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-xl hover:bg-muted hover:text-foreground sm:flex" aria-label="Start voice call">
            <Phone size={16} />
          </button>
          <button className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-xl hover:bg-muted hover:text-foreground sm:flex" aria-label="Start video call">
            <Camera size={17} />
          </button>
          <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl hover:bg-muted hover:text-foreground" aria-label="More conversation options">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <div ref={scrollRef} data-lenis-prevent className="message-thread thin-scrollbar relative flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
        {error ? (
          <p className="relative rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {messages.map((message, index) => {
          const currentKey = dayKey(message.createdAt);
          const prevKey = index > 0 ? dayKey(messages[index - 1].createdAt) : null;
          const showDateLabel = index === 0 || currentKey !== prevKey;

          return (
            <div key={message.id} className="contents">
              {showDateLabel ? (
                <div className="relative mx-auto mb-1 text-[10px] font-medium text-muted-foreground">
                  {dayLabel(message.createdAt)}
                </div>
              ) : null}
              <Bubble
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
            </div>
          );
        })}
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

      <form onSubmit={submit} className="mx-3 mb-3 mt-1 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/75 p-2.5 shadow-sm backdrop-blur-xl">
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
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:text-foreground"
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
            className="min-h-10 flex-1 resize-none rounded-xl border border-transparent bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="relative block">
            <button
              type="button"
              onClick={() => setEmojiOpen((open) => !open)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Add emoji"
              aria-expanded={emojiOpen}
            >
              <Smile size={18} />
            </button>
            {emojiOpen ? (
              <div
                data-lenis-prevent
                className="absolute bottom-12 right-0 z-10 max-h-[min(390px,calc(100dvh-8rem))] overflow-y-auto overscroll-contain rounded-2xl shadow-xl"
                onWheelCapture={(event) => event.stopPropagation()}
                onTouchMoveCapture={(event) => event.stopPropagation()}
              >
                <EmojiPicker
                  className="message-emoji-picker"
                  onEmojiClick={(emojiData) => {
                    setDraft((current) => `${current}${emojiData.emoji}`);
                    setEmojiOpen(false);
                  }}
                  theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
                  lazyLoadEmojis
                  width={320}
                  height={390}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={sendDisabled}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
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
