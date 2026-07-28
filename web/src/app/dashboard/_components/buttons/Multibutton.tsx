import {type LucideIcon} from "lucide-react";
import { motion } from "framer-motion";

interface MultibuttonProps {
    tag?: string;
    label: string;
    icon?: LucideIcon
    className?: string;
    onClick: () => void;
    iconColor?: string;
    textClassName?: string;
};

export default function Multibutton({ tag, label, icon, className, onClick, iconColor, textClassName }: MultibuttonProps) {
    const Icon = icon;

    return (
        <motion.button whileHover={{scale: 0.98}} className={`${tag ?? ""} w-[18%] h-[60%] bg-[#1D1D1D] rounded-2xl flex justify-center items-center gap-2.5 cursor-pointer ${className ?? ""}`} onClick={onClick}>
            {Icon ? <Icon color={iconColor} size={20}/> : null}
            <p className={textClassName}>{label}</p>
        </motion.button>
    );
};



