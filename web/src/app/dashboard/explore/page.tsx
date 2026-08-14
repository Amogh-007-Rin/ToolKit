"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, UserRound, X, Users, MapPin, BriefcaseBusiness, ArrowUpRight } from "lucide-react";
import Spinner from "@/components/ui/loaders/Spinner";

interface ExploreUser {
  id: string;
  name: string | null;
  image: string | null;
  tag: string | null;
  bio: string | null;
  location: string | null;
  role: string | null;
  skills: string[];
  followers: number;
  following: number;
}

export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExploreUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const q = query.trim();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      if (!q) {
        setResults([]);
        setSearched(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setResults(data.users ?? []);
        setSearched(true);
      } catch {
        // silently fail
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/35">
      <header className="relative w-full shrink-0 border-b border-border/60 bg-card/70 px-5 py-7 sm:px-10 sm:py-9">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex w-full max-w-4xl flex-col gap-6"
        >
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Users size={14} /> Community
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">Explore people</h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">Find builders, creators, and new perspectives by their unique ToolKit tag.</p>
            </div>
            <div className="hidden rounded-2xl border border-border bg-background/60 px-4 py-3 text-right sm:block">
              <p className="text-xs text-muted-foreground">Search by</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">@toolkit-tag</p>
            </div>
          </div>

          <div className="group flex h-14 w-full items-center rounded-2xl border border-border bg-background px-2 transition-[border-color,box-shadow] focus-within:border-foreground/25 focus-within:shadow-[0_8px_24px_-18px_rgba(0,0,0,0.45)] sm:h-16">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors group-focus-within:bg-foreground group-focus-within:text-background sm:h-11 sm:w-11">
              <Search size={19} />
            </div>
            <input
              type="search"
              aria-label="Search profiles by tag"
              placeholder="Search by tag, for example @johnsmith"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none sm:px-4 sm:text-base [&::-webkit-search-cancel-button]:appearance-none [&::-ms-clear]:hidden"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                ><X size={16} /></motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </header>

      <div data-lenis-prevent className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 thin-scrollbar">
        {loading ? (
          <div className="w-full flex justify-center pt-20">
            <Spinner size="lg" label="Searching profiles" />
          </div>
        ) : searched ? (
          results.length > 0 ? (
            <div className="mx-auto w-full max-w-4xl">
              <div className="mb-4 flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-foreground">People</p>
                <p className="text-xs text-muted-foreground tabular-nums">{results.length} {results.length === 1 ? "result" : "results"}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <AnimatePresence mode="popLayout">
              {results.map((user, index) => (
                <motion.button
                  key={user.id}
                  onClick={() => router.push(`/profile/${encodeURIComponent(user.tag ?? "")}`)}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  className="group relative flex min-h-42 flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 text-left transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-[0_14px_32px_-24px_rgba(0,0,0,0.45)] cursor-pointer sm:p-5"
                >
                  <div className="flex w-full items-start gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-shade-background flex items-center justify-center text-lg font-semibold text-foreground shrink-0 overflow-hidden ring-1 ring-border/70">
                    {user.image ? (
                      <Image src={user.image} alt={user.name || "User"} width={52} height={52} unoptimized className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      (user.name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{user.name || "Anonymous"}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">@{user.tag}</p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background"><ArrowUpRight size={16} /></span>
                  </div>

                  {user.bio && <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted-foreground">{user.bio}</p>}

                  <div className="mt-4 flex w-full items-end justify-between gap-3 border-t border-border/60 pt-3">
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {user.role && <span className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[11px] text-foreground"><BriefcaseBusiness size={11} />{user.role}</span>}
                      {user.location && <span className="flex max-w-32 items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[11px] text-muted-foreground"><MapPin size={11} className="shrink-0" /><span className="truncate">{user.location}</span></span>}
                      {user.skills.slice(0, 2).map((skill) => <span key={skill} className="rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground">{skill}</span>)}
                    </div>
                    <div className="shrink-0 text-right"><p className="text-sm font-semibold tabular-nums text-foreground">{user.followers}</p><p className="text-[10px] text-muted-foreground">followers</p></div>
                  </div>
                </motion.button>
              ))}
              </AnimatePresence>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-12 flex max-w-sm flex-col items-center rounded-3xl border border-border bg-card px-8 py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <UserRound size={24} className="text-muted-foreground" />
              </div>
              <p className="mt-4 font-semibold text-foreground">No matching profiles</p><p className="mt-1 text-sm leading-5 text-muted-foreground">Try another tag or check the spelling of your search.</p>
            </motion.div>
          )
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto mt-12 flex max-w-md flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-border bg-card text-muted-foreground"><Users size={25} /></div>
            <p className="mt-4 font-semibold text-foreground">Discover the ToolKit community</p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Enter a profile tag above to find people and explore what they are building with.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
