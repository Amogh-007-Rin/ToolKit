"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Search,
  Trash2,
  History,
  MessageSquareText,
} from "lucide-react";
import { timeAgo } from "@/lib/timeAgo";

const SIDEBAR_WIDTH = 268;

export interface ChatMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
}

interface CollapsibleSidebarProps {
  chats: ChatMeta[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
}

export default function CollapsibleSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: CollapsibleSidebarProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return chats;
    return chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(term) ||
        (chat.lastMessage ?? "").toLowerCase().includes(term)
    );
  }, [chats, search]);

  return (
    <div className="relative h-full">
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: SIDEBAR_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="h-full overflow-hidden"
          >
            <div className="collapsible-sidebar w-full h-full bg-sidebar flex flex-col overflow-hidden">
                <div className="part-1 w-full h-16 px-4 flex items-center justify-between border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-sidebar-foreground">
                      Recent Chats
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: -180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCollapsed(true)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors cursor-pointer"
                    aria-label="Collapse sidebar"
                  >
                    <PanelLeftClose size={17} className="text-sidebar-foreground" />
                  </motion.button>
                </div>

                <div className="part-2 w-full px-3 pt-3 flex flex-col gap-2 shrink-0">
                  <button
                    onClick={onNewChat}
                    className="w-full h-10 rounded-xl bg-foreground text-card text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
                  >
                    <SquarePen size={15} />
                    New chat
                  </button>
                  <div className="h-9 flex items-center gap-2 px-3 rounded-xl bg-card border border-theme-button-insider/20 focus-within:border-theme-button-insider/40 transition-colors">
                    <Search size={14} className="text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search chats…"
                      className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="part-3 w-full flex-1 min-h-0 overflow-y-auto px-2 py-3">
                  {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
                      {chats.length === 0 ? (
                        <>
                          <History size={18} className="text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            No chats yet. <br />
                            Start a conversation with Toolkit AI.
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No chats match your search
                        </p>
                      )}
                    </div>
                  ) : (
                    filtered.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className={`group w-full rounded-xl px-3 py-2.5 mb-1 cursor-pointer transition-colors ${
                          activeChatId === chat.id ? "bg-ai-chat-history" : "hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquareText
                            size={14}
                            className="text-muted-foreground shrink-0"
                          />
                          <p
                            className={`flex-1 min-w-0 truncate text-[13px] font-medium ${
                              activeChatId === chat.id
                                ? "text-theme-button-insider"
                                : "text-sidebar-foreground"
                            }`}
                          >
                            {chat.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 shrink-0 rounded-md flex items-center justify-center hover:bg-muted/80 transition-all cursor-pointer"
                            aria-label="Delete chat"
                          >
                            <Trash2
                              size={13}
                              className="text-muted-foreground hover:text-red-500"
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1 pl-6 leading-2">
                          {chat.lastMessage && (
                            <p className="flex-1 min-w-0 truncate text-xs text-muted-foreground">
                              {chat.lastMessage}
                            </p>
                          )}
                          <span className="text-[11px] text-muted-foreground/70 shrink-0">
                            {timeAgo(chat.updatedAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {collapsed && (
          <motion.button
            key="expand"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
            whileHover={{ scale: 1.2, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCollapsed(false)}
            className="absolute -left-12 top-2 w-10 h-10 flex items-center justify-center cursor-pointer"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={18} className="text-sidebar-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
