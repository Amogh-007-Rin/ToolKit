"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Bookmark, Star, ImageIcon } from "lucide-react";

type Tab = "posts" | "saved" | "featured";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "posts", label: "Posts", icon: LayoutGrid },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "featured", label: "Featured", icon: Star },
];

function EmptyGrid({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 py-10">
      <ImageIcon size={40} className="text-muted-foreground/50" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

export default function PostNavigationBar() {
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-center w-full h-20 border-b border-border shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center gap-2 h-full flex-1 border-t-2 transition-colors cursor-pointer ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={18} fill={active ? "currentColor" : "none"} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === "posts" && (
              <div className="w-full h-full grid grid-cols-3 gap-1 p-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center"
                  >
                    <ImageIcon size={20} className="text-muted-foreground/40" />
                  </div>
                ))}
              </div>
            )}
            {activeTab === "saved" && (
              <EmptyGrid message="No saved posts yet" />
            )}
            {activeTab === "featured" && (
              <EmptyGrid message="No featured posts yet" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
