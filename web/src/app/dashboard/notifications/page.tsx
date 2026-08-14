"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Bell, UserRound, X } from "lucide-react";
import { timeAgo } from "@/lib/timeAgo";
import Spinner from "@/components/ui/loaders/Spinner";

interface AppNotification {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actor: { name: string | null; image: string | null; tag: string | null };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setNotifications(data.notifications ?? []);
        }
        await fetch("/api/notifications", { method: "PATCH" });
        if (!cancelled) {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearNotification = async (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 250);
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    } catch {
      // silently fail
    }
  };

  const clearAll = async () => {
    const previous = notifications;
    notifications.forEach((n, i) => {
      setTimeout(() => {
        setRemovingIds((prev) => new Set(prev).add(n.id));
      }, i * 120);
    });
    setTimeout(() => {
      setNotifications([]);
      setRemovingIds(new Set());
    }, notifications.length * 120 + 300);
    try {
      await fetch("/api/notifications", { method: "DELETE" });
    } catch {
      setNotifications(previous);
      setRemovingIds(new Set());
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col p-3 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">All Notifications</h1>
        {!loading && notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="h-9 px-4 rounded-xl text-sm text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Spinner size="lg" label="Loading notifications" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
              <Bell size={24} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={
                removingIds.has(notification.id)
                  ? { x: "100%", opacity: 0 }
                  : { x: 0, opacity: 1 }
              }
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="group flex items-start gap-3 rounded-2xl border border-border bg-card px-3 py-3 sm:items-center sm:px-4"
            >
                <div className="w-10 h-10 rounded-full bg-shade-background flex items-center justify-center overflow-hidden shrink-0">
                  {notification.actor.image ? (
                    <Image
                      src={notification.actor.image}
                      alt={notification.actor.name ?? "User"}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-sm font-semibold text-foreground">
                      {(notification.actor.name || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{notification.actor.name || "Someone"}</span>{" "}
                    started following you
                    {notification.actor.tag && (
                      <span className="text-muted-foreground"> (@{notification.actor.tag})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
                </div>
                <button
                  onClick={() => clearNotification(notification.id)}
                  title="Clear notification"
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-opacity hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
                <UserRound size={16} className="text-muted-foreground shrink-0" />
              </motion.div>
            )))}
      </div>
    </div>
  );
}
