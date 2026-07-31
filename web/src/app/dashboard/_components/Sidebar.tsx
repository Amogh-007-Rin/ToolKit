'use client'

import { useState } from "react";
import { House, Kayak, LayoutDashboard, MessagesSquare, Settings, Spool } from "lucide-react";
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

  return (
    <div className="side-navigation w-[5%] h-full rounded-3xl bg-[#1D1D1D] flex flex-col justify-center items-center p-2">
      <div className="part-1 w-[90%] h-[10%] flex items-center justify-center">
        <AnimatedLogo />
      </div>
      <div className="part-2 w-[90%] h-[65%] flex flex-col items-center justify-center gap-4">
        {navItems.map((item) => (
          <Navbutton
            key={item.route}
            tag="home-nav-button"
            icon={item.icon}
            onClick={() => router.push(item.route)}
            isActive={pathname === item.route}
            iconColor={pathname === item.route ? "#000000" : "#FFFFFF"}
          />
        ))}
      </div>
      <div className="part-3 w-[90%] h-[25%] flex flex-col justify-center items-center gap-4">
        <Notificationbutton onClick={() => setShowNotifications(true)} />
        <SignoutButton onClick={checkLog} />
        <Profilebutton onClick={() => router.push("/profile")} />
      </div>
      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
};

function checkLog() {
  alert("button clicked")
};