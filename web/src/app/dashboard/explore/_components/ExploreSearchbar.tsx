"use client";

import { motion } from "framer-motion";
import { Search, X } from "lucide-react";

export default function ExploreSearchbar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-12 w-full min-w-0 rounded-2xl bg-card lg:w-164">
      <motion.label
        htmlFor="explore-search"
        className="flex h-full w-12 shrink-0 cursor-text items-center justify-center rounded-l-2xl"
        whileHover="hover"
      >
        <motion.span
          className="flex h-full w-full items-center justify-center rounded-l-2xl"
          variants={{
            hover: {
              rotate: [0, 25, -25, 20, -20, 0],
              transition: { duration: 0.5 },
            },
          }}
        >
          <Search size={20} className="text-foreground" />
        </motion.span>
      </motion.label>
      <input
        id="explore-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search Creators..."
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 [&::-webkit-search-cancel-button]:appearance-none [&::-ms-clear]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="grid h-full w-12 shrink-0 cursor-pointer place-items-center rounded-r-2xl text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
