"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Loader2,
  SearchX,
  ArrowRight,
  ExternalLink,
  BookmarkPlus,
  Check,
  Folder,
} from "lucide-react";
import { TOOL_ICONS } from "../_components/tool-icons";
import { useCollections } from "../_components/CollectionsProvider";

interface AIResult {
  name: string;
  link: string;
  description: string;
  reason: string;
}

function hostOf(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

export default function AISearchPage() {
  const router = useRouter();
  const { collections, addTool } = useCollections();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AIResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [savingTo, setSavingTo] = useState<string | null>(null);

  const savedIn = (name: string) =>
    collections.find((c) =>
      c.tools.some((t) => t.name.toLowerCase() === name.toLowerCase())
    );

  const search = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setSearched(false);
    setOpenMenu(null);
    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI search failed. Try again.");
        return;
      }
      setResults(data.results ?? []);
      setSearched(true);
    } catch {
      setError("AI search failed. Try again.");
    } finally {
      setLoading(false);
    }
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}
      <div className="w-full flex flex-col items-center gap-6 pt-12 shrink-0">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Sparkles size={20} className="text-primary" />
          </motion.div>
          <h1 className="text-3xl text-foreground font-bold">AI Tool Search</h1>
        </div>
        <p className="text-muted-foreground">
          Describe what you need — Gemini searches the web and finds tools you can save to your collections
        </p>

        <div className="w-[60%] max-w-2xl bg-card rounded-2xl flex items-center shadow-sm border border-border focus-within:border-primary/50 transition-colors">
          <div className="h-full w-14 flex items-center justify-center">
            <Sparkles size={22} className="text-primary shrink-0" />
          </div>
          <input
            type="text"
            placeholder="e.g. a tool to generate images for my side projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            className="h-14 flex-1 bg-transparent focus:outline-none focus:ring-0 text-lg text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={search}
            disabled={!query.trim() || loading}
            className="mx-3 h-10 px-6 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Searching...
              </>
            ) : (
              <>
                Search <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Sparkles size={24} className="text-primary" />
            </motion.div>
            <p className="text-sm text-muted-foreground">Gemini is searching the web...</p>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
              <SearchX size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : searched ? (
          results.length > 0 ? (
            <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Found {results.length} tool{results.length === 1 ? "" : "s"} on the web
              </p>
              {results.map((result, index) => {
                const Icon = TOOL_ICONS.sparkles;
                const saved = savedIn(result.name);
                return (
                  <motion.div
                    key={`${result.name}-${result.link}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                    className="flex items-start gap-4 bg-card rounded-2xl p-4 border border-border hover:border-primary/40 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-shade-background flex items-center justify-center shrink-0 overflow-hidden">
                      <Icon size={22} className="text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-foreground font-semibold truncate">{result.name}</p>
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
                        <p className="text-sm text-muted-foreground mt-0.5">{result.description}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="text-foreground/80">Why it fits: </span>
                        {result.reason}
                      </p>
                    </div>
                    <div className="relative shrink-0">
                      {saved ? (
                        <span className="h-9 px-4 rounded-xl bg-primary/10 text-primary text-xs font-medium flex items-center gap-1.5">
                          <Check size={14} /> Saved to {saved.title}
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === result.name ? null : result.name)
                          }
                          className="h-9 px-4 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          {savingTo === result.name ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <BookmarkPlus size={14} />
                          )}
                          Save
                        </button>
                      )}
                      {openMenu === result.name && !saved && (
                        <div className="absolute right-0 top-11 z-20 w-60 bg-card border border-border rounded-xl shadow-lg p-1.5 flex flex-col max-h-64 overflow-y-auto">
                          <p className="text-xs text-muted-foreground px-2 py-1.5">
                            Save to collection
                          </p>
                          {collections.length === 0 ? (
                            <button
                              onClick={() => router.push("/dashboard/tools")}
                              className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-primary hover:bg-muted/60 transition-colors cursor-pointer text-left"
                            >
                              <Folder size={14} />
                              Create a collection first
                            </button>
                          ) : (
                            collections.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => saveTo(result, c.id)}
                                className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-left"
                              >
                                <Folder size={14} className="text-muted-foreground shrink-0" />
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
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                <SearchX size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No tools found on the web for your request. Try describing it differently.
              </p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
