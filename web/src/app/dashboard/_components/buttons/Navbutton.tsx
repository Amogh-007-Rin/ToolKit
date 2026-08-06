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
};

const ICON_HOVER: Record<string, Variants> = {
    gear: {
        rest: { rotate: 0 },
        hover: { rotate: 90, transition: { duration: 0.45, ease: "easeInOut" } },
    },
};

export default function Navbutton({ tag, icon, className, onClick, iconClassName, isActive, hover }: NavbuttonProps) {
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
        </motion.button>
    );
};
