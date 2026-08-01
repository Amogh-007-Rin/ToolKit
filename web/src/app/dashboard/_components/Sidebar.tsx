'use client'

import { useState } from "react";
import { House, Kayak, LayoutDashboard, MessagesSquare, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import AnimatedLogo from "./AnimatedLogo";
import Navbutton from "./buttons/Navbutton";
import NotificationPanel from "./NotificationPanel";
import Profilebutton from "@/components/ui/buttons/Profilebutton";
import Notificationbutton from "@/components/ui/buttons/Notificationbutton";
import SignoutButton from "@/components/ui/buttons/Signoutbutton";

const navItems = [
  { icon: House, route: "/dashboard" },
  { icon: LayoutDashboard, route: "/dashboard/tools" },
  { icon: MessagesSquare, route: "/dashboard/messages" },
  { icon: Kayak, route: "/dashboard/explore" },
  { icon: Settings, route: "/dashboard/settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    <div className="side-navigation w-[5%] h-full rounded-3xl bg-sidebar flex flex-col justify-center items-center p-2">
      <div className="part-1 w-[90%] h-[10%] flex items-center justify-center">
        <AnimatedLogo />
      </div>
      <div className="part-2 w-[95%] h-[65%] flex flex-col items-center justify-center gap-4">
        {navItems.map((item) => (
          <Navbutton
            key={item.route}
            tag="home-nav-button"
            icon={item.icon}
            onClick={() => router.push(item.route)}
            isActive={pathname === item.route}
            iconClassName={pathname === item.route ? "text-background" : "text-sidebar-foreground"}
          />
        ))}
      </div>
      <div className="part-3 w-[90%] h-[25%] flex flex-col justify-evenly items-center">
        <Notificationbutton onClick={() => setShowNotifications(true)} />
        <SignoutButton onClick={handleSignOut} />
        <Profilebutton onClick={() => router.push("/profile")} />
      </div>
      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
};