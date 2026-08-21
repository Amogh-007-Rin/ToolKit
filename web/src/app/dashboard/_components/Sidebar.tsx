'use client'

import { useCallback, useEffect, useState } from "react";
import { Bell, House, Kayak, LayoutDashboard, Menu, MessagesSquare, Settings, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import AnimatedLogo from "./AnimatedLogo";
import Navbutton from "./buttons/Navbutton";
import NotificationPanel from "./NotificationPanel";
import Profilebutton from "@/components/ui/buttons/Profilebutton";
import Notificationbutton from "@/components/ui/buttons/Notificationbutton";
import SignoutButton from "@/components/ui/buttons/Signoutbutton";
import { messagingSocket, listRooms } from "@/services/messaging";

const navItems: { icon: typeof House; route: string; label: string; hover?: "gear" }[] = [
  { icon: House, route: "/dashboard", label: "Overview" },
  { icon: LayoutDashboard, route: "/dashboard/tools", label: "Tools" },
  { icon: MessagesSquare, route: "/dashboard/messages", label: "Messages" },
  { icon: Sparkles, route: "/dashboard/ai-search", label: "AI Search" },
  { icon: Kayak, route: "/dashboard/explore", label: "Explore" },
  { icon: Settings, route: "/dashboard/settings", label: "Settings", hover: "gear" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnread, setMessageUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const meId = session?.user?.id;

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchMessageUnread = useCallback(async () => {
    try {
      const { rooms } = await listRooms();
      const count = rooms.reduce((sum, room) => sum + (room.unreadCount ?? 0), 0);
      setMessageUnread(count);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => {
      fetchUnreadCount();
      fetchMessageUnread();
    }, 0);
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchMessageUnread();
    }, 10_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [fetchUnreadCount, fetchMessageUnread]);

  useEffect(() => {
    const unsub = messagingSocket.onEvent((event) => {
      if (event.type === "message" && event.message.senderId !== meId) {
        setMessageUnread((prev) => prev + 1);
      } else if (event.type === "connect") {
        fetchMessageUnread();
      }
    });
    return unsub;
  }, [meId, fetchMessageUnread]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      if (!csrfRes.ok) throw new Error("Could not start sign out");
      const { csrfToken } = await csrfRes.json();

      const res = await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          callbackUrl: "/",
          json: "true",
        }),
      });
      if (!res.ok) throw new Error("Sign out failed");

      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <motion.button
        className="fixed left-3 top-3 z-[60] flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-sidebar text-foreground shadow-lg shadow-black/10 md:hidden"
        onClick={() => setMenuOpen((prev) => !prev)}
        whileTap={{ scale: 0.92 }}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={menuOpen ? "close" : "open"}
            className="flex items-center justify-center"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </motion.span>
        </AnimatePresence>
        {!menuOpen && messageUnread > 0 && (
          <motion.span
            className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            {messageUnread > 99 ? "99+" : messageUnread}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              className="side-navigation fixed bottom-0 left-0 top-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden rounded-r-3xl bg-sidebar px-3 pb-5 pt-3 md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="mb-4 flex h-11 shrink-0 items-center justify-end">
                <AnimatedLogo size={32} />
              </div>
              <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.route;
                  return (
                    <motion.button
                      key={item.route}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${
                        isActive ? "bg-foreground text-background" : "text-sidebar-foreground"
                      }`}
                      onClick={() => {
                        setMenuOpen(false);
                        router.push(item.route);
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Icon size={20} strokeWidth={2} className="shrink-0" />
                      <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                      {item.route === "/dashboard/messages" && messageUnread > 0 && (
                        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {messageUnread > 99 ? "99+" : messageUnread}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
                <motion.button
                  key="notifications"
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${
                    pathname === "/dashboard/notifications" ? "bg-foreground text-background" : "text-sidebar-foreground"
                  }`}
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/dashboard/notifications");
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Bell size={20} strokeWidth={2} className="shrink-0" />
                  <span className="flex-1 text-left text-sm font-medium">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </motion.button>
              </nav>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <Profilebutton
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  imageUrl={session?.user?.image}
                  name={session?.user?.name}
                />
                <SignoutButton onClick={handleSignOut} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="side-navigation hidden h-full w-20 shrink-0 flex-col items-center justify-center overflow-visible rounded-3xl bg-sidebar p-2 md:flex">
        <div className="part-1 flex h-[10%] w-[90%] items-center justify-center">
          <AnimatedLogo />
        </div>
        <nav className="part-2 flex h-[65%] w-[95%] flex-col items-center justify-center gap-4">
          {navItems.map((item) => (
            <Navbutton
              key={item.route}
              tag="home-nav-button"
              icon={item.icon}
              onClick={() => router.push(item.route)}
              isActive={pathname === item.route}
              hover={item.hover}
              iconClassName={pathname === item.route ? "text-background" : "text-sidebar-foreground"}
              badge={item.route === "/dashboard/messages" ? messageUnread : undefined}
            />
          ))}
        </nav>
        <div className="part-3 flex h-[25%] w-[90%] flex-col items-center justify-evenly">
          <Notificationbutton count={unreadCount} onClick={() => setShowNotifications(true)} />
          <SignoutButton onClick={handleSignOut} />
          <Profilebutton
            onClick={() => router.push("/profile")}
            imageUrl={session?.user?.image}
            name={session?.user?.name}
          />
        </div>
      </aside>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          fetchUnreadCount();
        }}
      />
    </>
  );
};
