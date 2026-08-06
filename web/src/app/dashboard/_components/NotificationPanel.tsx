'use client'

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, Bell } from "lucide-react";
import Image from "next/image";
import { timeAgo } from "@/lib/timeAgo";

interface AppNotification {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actor: { name: string | null; image: string | null; tag: string | null };
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DROPLETS = [
  { angle: -15, dist: 60, delay: 0.08 },
  { angle: 10, dist: 80, delay: 0.15 },
  { angle: -5, dist: 100, delay: 0.22 },
  { angle: 20, dist: 55, delay: 0.1 },
  { angle: -25, dist: 70, delay: 0.18 },
];

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const [isExpanding, setIsExpanding] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications?limit=7");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setNotifications(data.notifications ?? []);
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
  }, [isOpen]);

  const handleViewAll = () => {
    setIsExpanding(true);
    setTimeout(() => {
      onClose();
      setIsExpanding(false);
      router.push("/dashboard/notifications");
    }, 400);
  };

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
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ backgroundColor: "rgba(0,0,0,0)" }}
            animate={{ backgroundColor: isExpanding ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.4)" }}
            exit={{ backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            onClick={isExpanding ? undefined : onClose}
          />
          <div className="fixed -top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <svg className="absolute w-0 h-0">
              <defs>
                <filter id="slime-goo">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
                    result="goo"
                  />
                  <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
              </defs>
            </svg>
            <motion.div
              className="pointer-events-auto"
              initial={{ y: "-120%", width: "100%", maxWidth: "48rem" }}
              animate={{
                y: 0,
                width: "100%",
                maxWidth: isExpanding ? "100%" : "48rem",
              }}
              exit={{ y: "-120%" }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 18,
                mass: 0.7,
              }}
            >
              <motion.div
                className="relative bg-card shadow-2xl overflow-hidden"
                style={{ filter: "url(#slime-goo)" }}
                animate={{
                  borderRadius: isExpanding ? "0px" : "0 0 24px 24px",
                  clipPath: isExpanding
                    ? "inset(0 0 0 0 round 0px)"
                    : "inset(0 0 0 0 round 0 0 24px 24px)",
                }}
                initial={{
                  borderRadius: "0 0 24px 24px",
                  clipPath: "inset(0 47% 100% 47% round 50%)",
                }}
                exit={{
                  borderRadius: "0 0 24px 24px",
                  clipPath: "inset(0 47% 100% 47% round 50%)",
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <motion.div
                  className="absolute top-0 left-0 right-0 h-28"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)",
                  }}
                />
                {!isExpanding && DROPLETS.map((d, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-6 h-6 rounded-full bg-card"
                    style={{
                      top: -12,
                      left: "50%",
                      marginLeft: -12,
                    }}
                    initial={{ x: 0, y: 0, scale: 0.3 }}
                    animate={{ x: d.dist * Math.sin((d.angle * Math.PI) / 180), y: 140, scale: [0.3, 1.2, 0] }}
                    exit={{ x: 0, y: 0, scale: 0 }}
                    transition={{
                      duration: 1.2,
                      delay: d.delay,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                ))}
                <div className="relative p-6 z-10">
                  <div className="flex items-center justify-between h-10 mb-6 shrink-0">
                    <motion.h2
                      animate={{ scale: isExpanding ? 1.15 : 1, x: isExpanding ? 8 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-xl text-foreground font-semibold"
                    >
                      Notifications
                    </motion.h2>
                    <div className="flex items-center gap-3">
                      {notifications.length > 0 && (
                        <motion.button
                          animate={{ opacity: isExpanding ? 0 : 1, x: isExpanding ? 20 : 0 }}
                          transition={{ duration: 0.2 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={clearAll}
                          className="text-sm text-muted-foreground hover:text-red-500 transition-colors pointer-events-auto"
                        >
                          Clear all
                        </motion.button>
                      )}
                      <motion.button
                        animate={{ opacity: isExpanding ? 0 : 1, x: isExpanding ? 20 : 0 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleViewAll}
                        className="text-sm text-muted-foreground hover:text-theme-button-insider transition-colors pointer-events-auto"
                      >
                        View all
                      </motion.button>
                      <motion.button
                        animate={{ opacity: isExpanding ? 0 : 1, scale: isExpanding ? 0 : 1 }}
                        transition={{ duration: 0.15 }}
                        whileHover={{ rotate: 90 }}
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
                      >
                        <X size={20} />
                      </motion.button>
                    </div>
                  </div>
                  <motion.div
                    layout
                    animate={{ opacity: isExpanding ? 0 : 1 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3 min-h-20"
                  >
                    {loading ? (
                      <p className="text-muted-foreground text-center py-8">Loading...</p>
                    ) : notifications.length === 0 ? (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="text-muted-foreground text-center py-8"
                      >
                        No new notifications
                      </motion.p>
                    ) : (
                      <AnimatePresence initial={false}>
                        {notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={
                              removingIds.has(notification.id)
                                ? { x: "100%", opacity: 0 }
                                : { x: 0, opacity: 1 }
                            }
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="flex items-center gap-3 px-3 py-2 group"
                          >
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                              {notification.actor.image ? (
                                <Image
                                  src={notification.actor.image}
                                  alt={notification.actor.name ?? "User"}
                                  width={36}
                                  height={36}
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
                              </p>
                              <p className="text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
                            </div>
                            <button
                              onClick={() => clearNotification(notification.id)}
                              title="Clear notification"
                              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity cursor-pointer shrink-0"
                            >
                              <X size={12} />
                            </button>
                            <Bell size={14} className="text-muted-foreground shrink-0" />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
