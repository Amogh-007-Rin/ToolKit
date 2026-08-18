"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, BriefcaseBusiness, MapPin, UserRound, Users } from "lucide-react";
import type { ExploreUser } from "./types";

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export default function CreatorCard({
  user,
  index,
  reduceMotion,
  onOpen,
}: {
  user: ExploreUser;
  index: number;
  reduceMotion: boolean;
  onOpen: () => void;
}) {
  const name = user.name || user.tag || "ToolKit creator";

  return (
    <motion.button
      type="button"
      disabled={!user.tag}
      onClick={onOpen}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.025, 0.2) }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className="group relative flex h-71 min-w-0 flex-col items-center overflow-hidden rounded-md border border-border/50 bg-linear-to-br from-card via-card to-primary/6 px-4 pb-4 pt-5 text-center shadow-[0_5px_18px_rgba(31,25,50,0.06)] transition-shadow hover:shadow-[0_12px_28px_rgba(31,25,50,0.11)] disabled:cursor-default"
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/10 opacity-60 blur-3xl transition-opacity group-hover:opacity-100" />
      <ArrowUpRight className="absolute right-3 top-3 text-muted-foreground/40 transition-colors group-hover:text-foreground" size={14} />
      <div className="relative mb-3 grid h-20.5 w-20.5 shrink-0 place-items-center overflow-hidden rounded-full border border-foreground/70 bg-muted">
        {user.image ? (
          <Image src={user.image} alt={name} fill sizes="82px" className="object-cover" unoptimized />
        ) : (
          <span className="grid h-full w-full place-items-center bg-muted text-2xl font-semibold text-foreground">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <h2 className="max-w-full truncate text-[16px] font-medium tracking-[-0.02em]">{name}</h2>
      <p className="mt-1 flex h-5 max-w-full items-center gap-1 truncate text-[11px] text-muted-foreground">
        {user.role ? <BriefcaseBusiness size={11} /> : <UserRound size={11} />}
        {user.role || (user.tag ? `@${user.tag}` : "Creator")}
      </p>
      <p className="mt-3 line-clamp-3 min-h-12 max-w-60 text-[11px] leading-4 text-muted-foreground">
        {user.bio ||
          (user.skills.length
            ? `Exploring ${user.skills.slice(0, 3).join(", ")}.`
            : "Discovering and sharing useful tools with the community.")}
      </p>
      <div className="mt-auto flex w-full items-center border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users size={12} fill="currentColor" className="opacity-70" />
          {compact(user.followers)}
        </span>
        <span className="ml-5 flex items-center gap-1.5">
          <UserRound size={12} fill="currentColor" className="opacity-70" />
          {compact(user.following)}
        </span>
        {user.location ? (
          <span className="ml-auto flex max-w-[42%] items-center gap-1 truncate">
            <MapPin size={12} />
            <span className="truncate">{user.location}</span>
          </span>
        ) : (
          <span className="ml-auto h-4 w-4" />
        )}
      </div>
    </motion.button>
  );
}
