"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import CreatorCard from "./_components/CreatorCard";
import ExploreEmptyState from "./_components/ExploreEmptyState";
import ExploreFilters from "./_components/ExploreFilters";
import ExploreSearchbar from "./_components/ExploreSearchbar";
import {
  belongsToFilter,
  type ExploreFilter,
  type ExploreUser,
} from "./_components/types";

export default function ExplorePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ExploreFilter>("All");
  const [users, setUsers] = useState<ExploreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const q = query.trim();
        const res = await fetch(`/api/users/search${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as { users?: ExploreUser[] };
        setUsers(data.users ?? []);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 280 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visibleUsers = useMemo(
    () => users.filter((user) => belongsToFilter(user, activeFilter)),
    [activeFilter, users],
  );

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden text-foreground">
      <header className="relative flex h-17 shrink-0 items-center justify-center border-b border-border/70 px-5">
        <h1 className="text-[17px] font-bold tracking-wider">Explore Creators</h1>
      </header>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pb-4 pt-3 sm:px-5">
        <div className="mx-auto w-full max-w-460">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <ExploreFilters activeFilter={activeFilter} onChange={setActiveFilter} />
            <ExploreSearchbar value={query} onChange={setQuery} />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="h-71 animate-pulse rounded-md bg-skeleton" />
              ))}
            </div>
          ) : error ? (
            <ExploreEmptyState title="We couldn't load the marketplace" detail="Please refresh and try again." />
          ) : visibleUsers.length === 0 ? (
            <ExploreEmptyState
              title={query ? "No creators found" : `No ${activeFilter.toLowerCase()} creators yet`}
              detail={query ? "Try searching by another name, tag, role, or skill." : "Check back as the community grows."}
            />
          ) : (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
            >
              {visibleUsers.map((user, index) => (
                <CreatorCard
                  key={user.id}
                  user={user}
                  index={index}
                  reduceMotion={Boolean(reduceMotion)}
                  onOpen={() => user.tag && router.push(`/profile/${encodeURIComponent(user.tag)}`)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
