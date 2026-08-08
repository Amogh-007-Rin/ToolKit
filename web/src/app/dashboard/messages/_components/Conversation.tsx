"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { timeAgo } from "@/lib/timeAgo";
import {
  type ConnStatus,
  type Contact,
  type Message,
  type RoomListItem,
} from "@/services/messaging";

const STATUS_LABEL: Record<ConnStatus, string> = {
  connecting: "Connecting…",
  open: "Online",
  reconnecting: "Reconnecting…",
  offline: "Offline",
};

const STATUS_DOT: Record<ConnStatus, string> = {
  connecting: "bg-amber-500",
  open: "bg-green-500",
  reconnecting: "bg-amber-500",
  offline: "bg-red-500",
};

interface TempMessage {
  tempId: string;
  content: string;
  createdAt: string;
}

function Bubble({
  mine,
  children,
  meta,
}: {
  mine: boolean;
  children: string;
  meta?: string;
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
        <p className="whitespace-pre-wrap break-words">{children}</p>
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
  status,
  error,
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
  onSend: (content: string) => void;
  onTypingChange: (typing: boolean, roomId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, tempMessages, typingUsers]);

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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) {
      return;
    }
    stopTyping();
    onSend(content);
    setDraft("");
  };

  if (!room) {
    return (
      <section className="flex-1 h-full bg-card rounded-3xl flex items-center justify-center">
        <p className="text-muted-foreground">Select a conversation to start messaging</p>
      </section>
    );
  }

  return (
    <section className="flex-1 h-full bg-card rounded-3xl flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />
          <p className="text-foreground font-semibold truncate">
            {contact?.name ?? contact?.tag ?? "Unknown user"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground ml-auto">{STATUS_LABEL[status]}</p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-2.5">
        {error ? (
          <p className="text-destructive text-sm bg-destructive/10 rounded-xl px-4 py-2">
            {error}
          </p>
        ) : null}
        {messages.map((message) => (
          <Bubble key={message.id} mine={message.senderId === meId} meta={timeAgo(message.createdAt)}>
            {message.content}
          </Bubble>
        ))}
        {tempMessages.map((temp) => (
          <Bubble key={temp.tempId} mine meta={`sending…`}>
            {temp.content}
          </Bubble>
        ))}
        {typingUsers.length > 0 ? <TypingIndicator /> : null}
      </div>

      <form onSubmit={submit} className="p-4 border-t border-border flex items-end gap-3">
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
          disabled={!draft.trim()}
          className="bg-primary text-primary-foreground rounded-full w-11 h-11 flex items-center justify-center cursor-pointer disabled:opacity-50"
          aria-label="Send message"
        >
          <SendHorizontal size={20} />
        </button>
      </form>
    </section>
  );
}
