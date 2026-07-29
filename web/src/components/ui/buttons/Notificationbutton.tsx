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
}


export default function Notificationbutton({ onClick }: NotificationbuttonProps) {
    return (
        <motion.button
            className="notification-btn w-14 h-14 rounded-full flex items-center justify-center cursor-pointer"
            // 2. Set the initial state name
            initial="rest"
            // 3. Trigger the hover state name
            whileHover="hover"
            // 4. Reset back to rest state when hover stops
            animate="rest"
            onClick={onClick}>
            {/* 5. Apply the variants to the motion component */}
            <motion.div variants={iconVariants}>
                <Bell color="white" />
            </motion.div>
        </motion.button>
    );
}
