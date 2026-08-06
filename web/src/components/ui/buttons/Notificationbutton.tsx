import { Bell } from "lucide-react";
import { motion, type Variants } from "framer-motion";

// 1. Defined variants to explicitly map the hover sequence and the rest state
const iconVariants: Variants = {
    rest: {
        rotate: 0,
        transition: { type: "spring", stiffness: 300, damping: 20 }
    },
    hover: {
        rotate: [0, 25, -25, 20, -20, 0],
        transition: { duration: 0.5 },
    },
};

interface NotificationbuttonProps {
    onClick: () => void;
    count?: number;
}


export default function Notificationbutton({ onClick, count = 0 }: NotificationbuttonProps) {
    return (
        <motion.button
            className="relative notification-btn w-14 h-14 rounded-full flex items-center justify-center cursor-pointer"
            // 2. Set the initial state name
            initial="rest"
            // 3. Trigger the hover state name
            whileHover="hover"
            // 4. Reset back to rest state when hover stops
            animate="rest"
            onClick={onClick}>
            {/* 5. Apply the variants to the motion component */}
            <motion.div variants={iconVariants}>
                <Bell className="text-foreground" size={20}/>
            </motion.div>
            {count > 0 && (
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
                >
                    {count > 99 ? "99+" : count}
                </motion.span>
            )}
        </motion.button>
    );
}
