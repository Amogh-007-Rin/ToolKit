"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Loader2, UserRound, ChevronRight } from "lucide-react";

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
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="w-full flex flex-col items-center gap-6 pt-10 shrink-0">
        <h1 className="text-4xl text-foreground font-bold">Explore</h1>
        <p className="text-muted-foreground">Search for users by their toolkit tag</p>

        <div className="w-[60%] max-w-2xl bg-card rounded-2xl flex items-center shadow-sm">
          <motion.div
            className="h-full w-14 flex items-center justify-center"
            whileHover="hover"
          >
            <motion.div
              className="w-full h-full flex items-center justify-center"
              variants={{
                hover: {
                  rotate: [0, 25, -25, 20, -20, 0],
                  transition: { duration: 0.5 },
                },
              }}
            >
              <Search size={24} className="text-foreground" />
            </motion.div>
          </motion.div>
          <input
            type="search"
            placeholder="Search by tag... e.g. @johnsmith"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 flex-1 bg-transparent focus:outline-none focus:ring-0 text-lg text-foreground placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none [&::-ms-clear]:hidden"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="w-full flex justify-center pt-16">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : searched ? (
          results.length > 0 ? (
            <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
              {results.map((user, index) => (
                <motion.button
                  key={user.id}
                  onClick={() => router.push(`/profile/${encodeURIComponent(user.tag ?? "")}`)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors cursor-pointer text-left"
                >
                  <div className="w-14 h-14 rounded-full bg-shade-background flex items-center justify-center text-lg font-semibold text-foreground shrink-0 overflow-hidden">
                    {user.image ? (
                      <Image src={user.image} alt={user.name || "User"} width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                      (user.name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-semibold truncate">{user.name || "Anonymous"}</p>
                      {user.role && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs shrink-0">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.tag}
                      {user.location ? ` · ${user.location}` : ""}
                    </p>
                    {user.bio && <p className="text-sm text-muted-foreground truncate mt-0.5">{user.bio}</p>}
                    {user.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.skills.slice(0, 4).map((skill) => (
                          <span key={skill} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{user.followers}</p>
                    <p className="text-xs text-muted-foreground">followers</p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-4 pt-16">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                <UserRound size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No users found with that tag
              </p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
