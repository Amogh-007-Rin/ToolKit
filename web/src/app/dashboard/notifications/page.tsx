"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, CheckCheck, Heart, MessageCircle, Settings2, UserPlus, UserRound, X } from "lucide-react";
import { timeAgo } from "@/lib/timeAgo";

interface AppNotification {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actor: { name: string | null; image: string | null; tag: string | null };
}

interface NotificationPreferences {
  notifyFollows: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notifyFollows: true,
  notifyLikes: true,
  notifyComments: true,
};

const PREFERENCE_OPTIONS = [
  { key: "notifyFollows" as const, label: "New followers", detail: "When someone starts following you", icon: UserPlus },
  { key: "notifyLikes" as const, label: "Post likes", detail: "When someone likes one of your posts", icon: Heart },
  { key: "notifyComments" as const, label: "Post comments", detail: "When someone comments on one of your posts", icon: MessageCircle },
];

function notificationMessage(type: string): string {
  if (type === "like") return "liked your post";
  if (type === "comment") return "commented on your post";
  return "started following you";
}

type NotificationGroup = {
  label: string;
  items: AppNotification[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function groupNotifications(notifications: AppNotification[], now: number): NotificationGroup[] {
  const groups: NotificationGroup[] = [
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const notification of notifications) {
    const age = now - new Date(notification.createdAt).getTime();
    if (age < DAY_MS) groups[0].items.push(notification);
    else if (age < DAY_MS * 7) groups[1].items.push(notification);
    else groups[2].items.push(notification);
  }

  return groups.filter((group) => group.items.length > 0);
}

function NotificationSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Loading notifications" aria-busy="true">
      {[{ labelWidth: "w-14", count: 4 }, { labelWidth: "w-20", count: 3 }].map((group, groupIndex) => (
        <div key={groupIndex}>
          <div className="border-b border-border/70 px-4 py-5 sm:px-6">
            <div className={`h-4 ${group.labelWidth} rounded-full bg-skeleton`} />
          </div>
          {Array.from({ length: group.count }).map((_, item) => (
            <div key={item} className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5 sm:px-6">
              <div className="h-12 w-12 shrink-0 rounded-full bg-skeleton" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className={`h-3.5 rounded-full bg-skeleton ${item % 2 === 0 ? "w-2/3" : "w-1/2"}`} />
                <div className="h-3 w-20 rounded-full bg-skeleton" />
              </div>
              <div className="hidden h-8 w-24 rounded-lg bg-skeleton sm:block" />
              <div className="h-8 w-8 rounded-full bg-skeleton" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [initialUnreadIds, setInitialUnreadIds] = useState<Set<string>>(new Set());
  const [referenceTime] = useState(Date.now);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [savingPreference, setSavingPreference] = useState<keyof NotificationPreferences | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load notifications");
        const data = (await res.json()) as { notifications?: AppNotification[] };
        const next = data.notifications ?? [];
        if (!cancelled) {
          setInitialUnreadIds(new Set(next.filter((item) => !item.read).map((item) => item.id)));
          setNotifications(next);
        }

        await fetch("/api/notifications", { method: "PATCH" });
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openSettings = async () => {
    setSettingsOpen(true);
    setPreferencesLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load preferences");
      const data = (await res.json()) as { preferences: NotificationPreferences };
      setPreferences(data.preferences);
    } catch {
      // Keep safe defaults when preferences cannot be loaded.
    } finally {
      setPreferencesLoading(false);
    }
  };

  const togglePreference = async (key: keyof NotificationPreferences) => {
    if (savingPreference) return;
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSavingPreference(key);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error("Could not save preference");
      const data = (await res.json()) as { preferences: NotificationPreferences };
      setPreferences(data.preferences);
    } catch {
      setPreferences(previous);
    } finally {
      setSavingPreference(null);
    }
  };

  const groups = useMemo(
    () => groupNotifications(notifications, referenceTime),
    [notifications, referenceTime],
  );

  const clearNotification = async (id: string) => {
    if (removingIds.has(id)) return;
    setRemovingIds((current) => new Set(current).add(id));
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove notification");
      setNotifications((current) => current.filter((item) => item.id !== id));
    } catch {
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const clearAll = async () => {
    if (clearingAll) return;
    const previous = notifications;
    setClearingAll(true);
    try {
      notifications.forEach((notification, index) => {
        window.setTimeout(() => {
          setRemovingIds((current) => new Set(current).add(notification.id));
        }, index * 55);
      });
      const request = fetch("/api/notifications", { method: "DELETE" });
      await new Promise((resolve) => window.setTimeout(resolve, notifications.length * 55 + 240));
      const res = await request;
      if (!res.ok) throw new Error("Could not clear notifications");
      setNotifications([]);
    } catch {
      setNotifications(previous);
    } finally {
      setRemovingIds(new Set());
      setClearingAll(false);
    }
  };

  const openProfile = (tag: string | null) => {
    if (tag) router.push(`/profile/${encodeURIComponent(tag)}`);
  };

  return (
    <main className="thin-scrollbar h-full min-h-0 w-full overflow-y-auto text-foreground">
      <section className="min-h-full w-full">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium tracking-wide">Notifications</h1>
            {!loading && notifications.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!loading && notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                disabled={clearingAll}
                className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => void openSettings()}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-card/50"
              aria-label="Customize notifications"
            >
              <Settings2 size={18} />
              <span className="hidden sm:inline">Customize</span>
            </button>
          </div>
        </header>

        {loading ? (
          <NotificationSkeleton />
        ) : error ? (
          <div className="flex min-h-[65vh] flex-col items-center justify-center px-6 text-center">
            <div className="mb-5 grid h-20 w-20 place-items-center rounded-full border-2 border-foreground">
              <Bell size={32} strokeWidth={1.6} />
            </div>
            <h2 className="text-lg font-semibold">Couldn&apos;t load activity</h2>
            <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
              Something went wrong while loading your notifications. Try refreshing the page.
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[65vh] flex-col items-center justify-center px-6 text-center"
          >
            <div className="relative mb-5 grid h-20 w-20 place-items-center rounded-full border-2 border-foreground">
              <Bell size={32} strokeWidth={1.6} />
              <span className="absolute right-0 top-0 grid h-7 w-7 place-items-center rounded-full border-4 border-card bg-primary text-primary-foreground">
                <CheckCheck size={13} strokeWidth={3} />
              </span>
            </div>
            <h2 className="text-lg font-semibold">You&apos;re all caught up</h2>
            <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
              New follows and activity from the community will appear here.
            </p>
          </motion.div>
        ) : (
          <div className="pb-8">
            {groups.map((group) => (
              <section key={group.label} aria-labelledby={`notifications-${group.label}`}>
                <h2
                  id={`notifications-${group.label}`}
                  className="border-b border-border/70 px-4 py-4 text-base font-bold sm:px-6"
                >
                  {group.label}
                </h2>
                <AnimatePresence initial={false}>
                  {group.items.map((notification, index) => {
                    const actorName = notification.actor.name || "Someone";
                    const isUnread = initialUnreadIds.has(notification.id);
                    return (
                      <motion.article
                        layout
                        key={notification.id}
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={
                          removingIds.has(notification.id)
                            ? { opacity: 0, x: reduceMotion ? 0 : "100%" }
                            : { opacity: 1, x: 0, y: 0 }
                        }
                        exit={{ opacity: 0, x: reduceMotion ? 0 : "100%", height: 0 }}
                        transition={{ duration: 0.2, delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.15) }}
                        className="group relative flex items-center gap-3 border-b border-border/70 px-4 py-3.5 transition-colors hover:bg-muted/45 sm:px-6"
                      >
                        {isUnread && <span className="absolute left-1.5 h-1.5 w-1.5 rounded-full bg-primary sm:left-3" />}
                        <button
                          type="button"
                          onClick={() => openProfile(notification.actor.tag)}
                          disabled={!notification.actor.tag}
                          className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-full bg-muted ring-1 ring-border disabled:cursor-default"
                          aria-label={`View ${actorName}'s profile`}
                        >
                          {notification.actor.image ? (
                            <Image
                              src={notification.actor.image}
                              alt={actorName}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="grid h-full w-full place-items-center text-base font-bold">
                              {actorName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openProfile(notification.actor.tag)}
                          disabled={!notification.actor.tag}
                          className="min-w-0 flex-1 cursor-pointer text-left disabled:cursor-default"
                        >
                          <p className="text-sm font-normal text-foreground">
                            <span className="font-semibold">{actorName}</span>{" "}
                            {notificationMessage(notification.type)}
                            {notification.actor.tag && (
                              <span className="text-muted-foreground"> (@{notification.actor.tag})</span>
                            )}
                          </p>
                          <p className="text-xs font-normal text-muted-foreground">
                            {timeAgo(notification.createdAt)}
                          </p>
                        </button>

                        {notification.actor.tag ? (
                          <button
                            type="button"
                            onClick={() => openProfile(notification.actor.tag)}
                            className="hidden h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-xs font-semibold text-card transition-transform hover:scale-[1.03] active:scale-95 sm:flex"
                          >
                            <UserRound size={14} />
                            View profile
                          </button>
                        ) : notification.type === "like" ? (
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Heart size={15} /></span>
                        ) : notification.type === "comment" ? (
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"><MessageCircle size={15} /></span>
                        ) : (
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserPlus size={15} /></span>
                        )}

                        <button
                          type="button"
                          onClick={() => void clearNotification(notification.id)}
                          disabled={removingIds.has(notification.id)}
                          aria-label="Remove notification"
                          title="Remove notification"
                          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground opacity-70 transition-colors hover:bg-muted hover:text-foreground group-hover:opacity-100 disabled:pointer-events-none"
                        >
                          <X size={15} />
                        </button>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </section>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close notification settings"
              className="fixed inset-0 z-40 cursor-default bg-black/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
            />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="notification-settings-title"
                initial={reduceMotion ? false : { opacity: 0, y: 42, scale: 0.84 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 38, scale: 0.86 }}
                transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 360, damping: 28, mass: 0.8 }}
                className="pointer-events-auto flex min-h-[34rem] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
              >
                <div className="flex items-start justify-between border-b border-border px-5 py-5">
                  <div>
                    <h2 id="notification-settings-title" className="text-lg font-bold">Notification preferences</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Choose which activity appears in your notifications.</p>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSettingsOpen(false)}
                    className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close settings"
                  >
                    <X size={19} />
                  </motion.button>
                </div>

                <div className="flex-1 space-y-2 p-4 sm:p-5">
                  {preferencesLoading ? (
                    <div className="space-y-2 animate-pulse" aria-label="Loading notification preferences">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="flex items-center gap-4 rounded-2xl p-3">
                          <span className="h-12 w-12 shrink-0 rounded-full bg-skeleton" />
                          <span className="flex-1 space-y-2">
                            <span className="block h-4 w-32 rounded-full bg-skeleton" />
                            <span className="block h-3 w-52 max-w-full rounded-full bg-skeleton" />
                          </span>
                          <span className="h-6 w-11 rounded-full bg-skeleton" />
                        </div>
                      ))}
                    </div>
                  ) : PREFERENCE_OPTIONS.map(({ key, label, detail, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => void togglePreference(key)}
                      disabled={preferencesLoading || savingPreference !== null}
                      className="flex w-full cursor-pointer items-center gap-4 rounded-2xl p-3.5 text-left transition-colors hover:bg-muted/70 disabled:cursor-wait disabled:opacity-60"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-foreground">
                        <Icon size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="block text-xs leading-5 text-muted-foreground">{detail}</span>
                      </span>
                      <span
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${preferences[key] ? "bg-primary" : "bg-muted"}`}
                        aria-hidden="true"
                      >
                        <span className={`absolute left-0 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${preferences[key] ? "translate-x-6" : "translate-x-1"}`} />
                      </span>
                    </button>
                  ))}
                </div>
                <p className="border-t border-border px-5 py-4 text-xs leading-5 text-muted-foreground">
                  Turning a category off stops future notifications. Your existing activity remains available until you remove it.
                </p>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
