import { type LucideIcon } from "lucide-react";

interface NavbuttonProps {
    tag?: string;
    icon?: LucideIcon
    className?: string;
    onClick: () => void;
    iconColor?: string;
};


export default function Navbutton({ tag, icon, className, onClick, iconColor }: NavbuttonProps) {

    const Icon = icon;

    return (
        <button className={`${tag ?? ""} w-[60%] h-[9%] rounded-2xl bg-[#FFFFFF] flex items-center justify-center ${className ?? ""}`} onClick={onClick}>
            {Icon ? <Icon color={iconColor} size={20} /> : null}
        </button>
    );
};