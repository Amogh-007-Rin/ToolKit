"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Sparkles,
  Loader2,
  ExternalLink,
  BookmarkPlus,
  Check,
  Folder,
  SearchX,
} from "lucide-react";
import { TOOL_ICONS } from "../_components/tool-icons";
import AnimatedLogo from "../_components/AnimatedLogo";
import OrbLoader from "@/components/ui/loaders/OrbLoader";
import CollapsibleSidebar, {
  type ChatMeta,
} from "../_components/CollapsibleSidebar";
import { useCollections } from "../_components/CollectionsProvider";

interface AIResult {
  name: string;
  link: string;
  description: string;
  reason: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content?: string;
  results?: AIResult[];
  error?: string;
}

const SUGGESTIONS = [
  "Generate images for my side projects",
  "Automate my social media posts",
  "Turn my notes into flashcards",
  "Track my freelance client invoices",
  "Build a landing page quickly",
];

function hostOf(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

export default function AISearchPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { collections, addTool } = useCollections();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [savingTo, setSavingTo] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 1500);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-search/chats", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { chats: [] }))
      .then(({ chats: list }: { chats: ChatMeta[] }) => {
        if (!cancelled) setChats(list);
      })
      .catch(() => {
        // sidebar just shows no history
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    },
    []
  );

  const savedIn = (name: string) =>
    collections.find((c) =>
      c.tools.some((t) => t.name.toLowerCase() === name.toLowerCase())
    );

  const bumpChat = (id: string, lastMessage: string) => {
    setChats((prev) => {
      const chat = prev.find((c) => c.id === id);
      if (!chat) return prev;
      const updated = { ...chat, lastMessage, updatedAt: new Date().toISOString() };
      return [updated, ...prev.filter((c) => c.id !== id)];
    });
  };

  const send = async (text?: string) => {
    const q = (text ?? query).trim();
    if (!q || loading) return;
    setQuery("");
    setOpenMenu(null);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: q }]);

    let chatId = activeChatId;
    try {
      if (!chatId) {
        const res = await fetch("/api/ai-search/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create chat");
        chatId = data.chat.id;
        setActiveChatId(chatId);
        setChats((prev) => [{ ...data.chat, lastMessage: q }, ...prev]);
      } else {
        bumpChat(chatId, q);
      }

      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, chatId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", error: data.error ?? "AI search failed. Try again." },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", results: data.results ?? [] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", error: "AI search failed. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectChat = async (id: string) => {
    if (id === activeChatId || loading) return;
    setOpenMenu(null);
    try {
      const res = await fetch(`/api/ai-search/chats/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(
        data.chat.messages.map(
          (message: {
            role: string;
            content: string;
            results: unknown;
            error: string | null;
          }) => ({
            role: message.role,
            content: message.content || undefined,
            results: (message.results as AIResult[]) ?? undefined,
            error: message.error ?? undefined,
          })
        )
      );
      setActiveChatId(id);
    } catch {
      // silently fail
    }
  };

  const deleteChat = async (id: string) => {
    if (!window.confirm("Delete this chat?")) return;
    try {
      await fetch(`/api/ai-search/chats/${id}`, { method: "DELETE" });
    } catch {
      // keep the chat in the list if the delete failed
      return;
    }
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
      setQuery("");
      setOpenMenu(null);
    }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setQuery("");
    setLoading(false);
    setOpenMenu(null);
  };

  const saveTo = async (result: AIResult, collectionId: string) => {
    if (savingTo) return;
    setSavingTo(result.name);
    setOpenMenu(null);
    await addTool(collectionId, {
      name: result.name,
      link: result.link,
      icon: "sparkles",
      logoUrl: null,
    });
    setSavingTo(null);
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-8 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <AnimatedLogo size={28} />
            <h1 className="text-lg text-foreground font-semibold">Toolkit AI</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-190 mx-auto px-6 pb-4">
          {messages.length === 0 ? (
            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <h2 className="text-2xl text-foreground font-medium">
                  What kind of tools should i find you today ?
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Describe what you need 
                  Toolkit AI searches the web for tools and lets
                  you save them to directly your collections
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => send(suggestion)}
                    className="text-left px-4 py-3 rounded-2xl bg-card border border-border text-sm text-foreground/80 hover:border-primary/40 hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  sessionImage={session?.user?.image ?? null}
                  sessionName={session?.user?.name ?? "You"}
                  savingTo={savingTo}
                  openMenu={openMenu}
                  onToggleMenu={(key) => setOpenMenu(openMenu === key ? null : key)}
                  onSave={(result, collectionId) => saveTo(result, collectionId)}
                  savedIn={savedIn}
                  collections={collections}
                  onGoToTools={() => router.push("/dashboard/tools")}
                />
              ))}
              {loading && <TypingIndicator />}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 w-full flex justify-center px-6 pb-6 pt-2">
        <div className="w-full max-w-250 flex items-end gap-2 bg-card border border-border rounded-[28px] px-5 py-2.5 shadow-sm focus-within:border-theme-button-insider/20 focus-within:shadow-md transition-all">
          <div className="self-center flex">
            <OrbLoader size={32} drag={false} cursorOn={false} animated={isTyping} />
          </div>
          <textarea
            rows={1}
            value={query}
            placeholder="Ask for a tool…"
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 200) + "px";
            }}
            className="flex-1 min-h-11 max-h-50 resize-none bg-transparent focus:outline-none focus:ring-0 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={() => send()}
            disabled={!query.trim() || loading}
            className="w-11 h-11 shrink-0 rounded-full bg-foreground text-card hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center"
            aria-label="Send"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowUp size={18} />
            )}
          </button>
        </div>
      </div>

      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}
      </div>

      <div className="fixed inset-y-0 right-0 z-50">
        <CollapsibleSidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={selectChat}
          onNewChat={startNewChat}
          onDeleteChat={deleteChat}
        />
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  sessionImage,
  sessionName,
  savingTo,
  openMenu,
  onToggleMenu,
  onSave,
  savedIn,
  collections,
  onGoToTools,
}: {
  message: ChatMessage;
  sessionImage: string | null;
  sessionName: string;
  savingTo: string | null;
  openMenu: string | null;
  onToggleMenu: (key: string) => void;
  onSave: (result: AIResult, collectionId: string) => void;
  savedIn: (name: string) => { title: string } | undefined;
  collections: { id: string; title: string; tools: unknown[] }[];
  onGoToTools: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end py-4">
        <div className="flex items-end gap-2.5 max-w-[85%]">
          <div className="bg-foreground text-card rounded-3xl rounded-br-lg px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
          {sessionImage ? (
            <img
              src={sessionImage}
              alt="you"
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-shade-background flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-foreground">
                {sessionName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 py-4">
      <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary/30 to-primary/5 flex items-center justify-center shrink-0 mt-1">
        <Sparkles size={14} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {message.error ? (
          <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <SearchX size={16} className="shrink-0 mt-0.5" />
            <span>{message.error}</span>
          </div>
        ) : message.results && message.results.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              Here are {message.results.length} tool
              {message.results.length === 1 ? "" : "s"} that fit your request
            </p>
            <div className="space-y-2.5">
              {message.results.map((result) => {
                const key = `${result.name}-${result.link}`;
                const Icon = TOOL_ICONS.sparkles;
                const saved = savedIn(result.name);
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-card rounded-2xl p-4 border border-border hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-shade-background flex items-center justify-center shrink-0 overflow-hidden">
                        <Icon size={20} className="text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-foreground font-semibold truncate">
                            {result.name}
                          </p>
                          <a
                            href={result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                          >
                            <ExternalLink size={12} />
                            {hostOf(result.link)}
                          </a>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.description}
                          </p>
                        )}
                        {result.reason && (
                          <p className="text-[13px] text-muted-foreground/80 mt-1.5 flex items-start gap-1.5">
                            <Sparkles size={12} className="text-primary shrink-0 mt-0.5" />
                            <span>{result.reason}</span>
                          </p>
                        )}
                      </div>
                      <div className="relative shrink-0">
                        {saved ? (
                          <span className="h-8 px-3.5 rounded-xl bg-primary/10 text-primary text-xs font-medium flex items-center gap-1.5">
                            <Check size={13} /> Saved
                          </span>
                        ) : (
                          <button
                            onClick={() => onToggleMenu(key)}
                            className="h-8 px-3.5 bg-shade-background text-foreground rounded-xl text-xs font-medium hover:bg-muted/60 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            {savingTo === result.name ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <BookmarkPlus size={13} />
                            )}
                            Save
                          </button>
                        )}
                        {openMenu === key && !saved && (
                          <div className="absolute right-0 top-10 z-20 w-60 bg-card border border-border rounded-xl shadow-lg p-1.5 flex flex-col max-h-64 overflow-y-auto">
                            <p className="text-xs text-muted-foreground px-2 py-1.5">
                              Save to collection
                            </p>
                            {collections.length === 0 ? (
                              <button
                                onClick={onGoToTools}
                                className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-primary hover:bg-muted/60 transition-colors cursor-pointer text-left"
                              >
                                <Folder size={14} />
                                Create a collection first
                              </button>
                            ) : (
                              collections.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => onSave(result, c.id)}
                                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-left"
                                >
                                  <Folder
                                    size={14}
                                    className="text-muted-foreground shrink-0"
                                  />
                                  <span className="truncate">{c.title}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {c.tools.length}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No tools found for your request. Try describing it differently.
          </p>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 py-4">
      <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary/30 to-primary/5 flex items-center justify-center shrink-0 mt-1">
        <Sparkles size={14} className="text-primary" />
      </div>
      <div className="flex items-center gap-1.5 h-9 px-4 bg-card rounded-2xl border border-border">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}