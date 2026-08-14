'use client'

import { useCallback, useEffect, useState } from "react";
import { House, Kayak, LayoutDashboard, MessagesSquare, Settings, Sparkles } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import AnimatedLogo from "./AnimatedLogo";
import Navbutton from "./buttons/Navbutton";
import NotificationPanel from "./NotificationPanel";
import Profilebutton from "@/components/ui/buttons/Profilebutton";
import Notificationbutton from "@/components/ui/buttons/Notificationbutton";
import SignoutButton from "@/components/ui/buttons/Signoutbutton";
import { messagingSocket, listRooms } from "@/services/messaging";

const navItems: { icon: typeof House; route: string; hover?: "gear" }[] = [
  { icon: House, route: "/dashboard" },
  { icon: LayoutDashboard, route: "/dashboard/tools" },
  { icon: MessagesSquare, route: "/dashboard/messages" },
  { icon: Sparkles, route: "/dashboard/ai-search" },
  { icon: Kayak, route: "/dashboard/explore" },
  { icon: Settings, route: "/dashboard/settings", hover: "gear" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnread, setMessageUnread] = useState(0);
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
    <aside className="side-navigation order-2 flex h-14 w-full shrink-0 items-center overflow-hidden rounded-2xl bg-sidebar px-1.5 py-1 md:order-none md:h-full md:w-20 md:flex-col md:justify-center md:overflow-visible md:rounded-3xl md:p-2">
      <div className="part-1 hidden w-[90%] items-center justify-center md:flex md:h-[10%]">
        <AnimatedLogo />
      </div>
      <nav className="part-2 flex h-full min-w-0 flex-1 items-center justify-around md:h-[65%] md:w-[95%] md:flex-col md:justify-center md:gap-4">
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
      <div className="part-3 flex h-full shrink-0 items-center md:h-[25%] md:w-[90%] md:flex-col md:justify-evenly">
        <Notificationbutton count={unreadCount} onClick={() => setShowNotifications(true)} />
        <div className="hidden md:block">
          <SignoutButton onClick={handleSignOut} />
        </div>
        <Profilebutton
          onClick={() => router.push("/profile")}
          imageUrl={session?.user?.image}
          name={session?.user?.name}
        />
      </div>
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          fetchUnreadCount();
        }}
      />
    </aside>
  );
};
