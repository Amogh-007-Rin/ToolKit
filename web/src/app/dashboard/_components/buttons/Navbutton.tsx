'use client'

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface NavbuttonProps {
    tag?: string;
    icon?: LucideIcon
    className?: string;
    onClick: () => void;
    iconClassName?: string;
    isActive?: boolean;
};

export default function Navbutton({ tag, icon, className, onClick, iconClassName, isActive }: NavbuttonProps) {
    const Icon = icon;

    return (
        <motion.button
            layout
            className={`${tag ?? ""} w-[70%] h-[9%] rounded-2xl cursor-pointer flex items-center justify-center relative ${className ?? ""}`}
            onClick={onClick}
        >
            {isActive && (
                <motion.div
                    layoutId="nav-active-bg"
                    className="absolute inset-0 rounded-2xl bg-foreground"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
            )}
            {Icon ? (
                <span className="relative z-10">
                    <Icon className={iconClassName ?? (isActive ? "text-background" : "text-foreground")} strokeWidth={2} size={20} />
                </span>
            ) : null}
        </motion.button>
    );
};
