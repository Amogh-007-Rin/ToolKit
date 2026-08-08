'use client'

import { motion, type Variants } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface NavbuttonProps {
    tag?: string;
    icon?: LucideIcon
    className?: string;
    onClick: () => void;
    iconClassName?: string;
    isActive?: boolean;
    hover?: "gear";
    badge?: number;
};

const ICON_HOVER: Record<string, Variants> = {
    gear: {
        rest: { rotate: 0 },
        hover: { rotate: 90, transition: { duration: 0.45, ease: "easeInOut" } },
    },
};

export default function Navbutton({ tag, icon, className, onClick, iconClassName, isActive, hover, badge }: NavbuttonProps) {
    const Icon = icon;

    return (
        <motion.button
            layout
            className={`${tag ?? ""} w-[70%] h-[9%] rounded-2xl cursor-pointer flex items-center justify-center relative ${className ?? ""}`}
            onClick={onClick}
            whileTap={{ scale: 0.92 }}
        >
            {isActive && (
                <motion.div
                    layoutId="nav-active-bg"
                    className="absolute inset-0 rounded-2xl bg-foreground"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
            )}
            {Icon ? (
                <motion.span
                    className="relative z-10"
                    variants={hover ? ICON_HOVER[hover] : undefined}
                    initial="rest"
                    animate="rest"
                    whileHover="hover"
                >
                    <Icon className={iconClassName ?? (isActive ? "text-background" : "text-foreground")} strokeWidth={2} size={20} />
                </motion.span>
            ) : null}
            {badge !== undefined && badge > 0 ? (
              <motion.span
                className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center z-20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                {badge > 99 ? "99+" : badge}
              </motion.span>
            ) : null}
        </motion.button>
    );
};
