'use client'

import { motion } from "framer-motion";
import Image from "next/image";

interface AuthSignInButtonProps {
    tag?: string;
    iconSrc: string;
    className?: string;
    onClick: () => void;
}

export default function AuthSignInButton({ iconSrc, className, onClick }: AuthSignInButtonProps) {
    return (
        <motion.button
            whileHover="hover"
            className="w-24 h-24 bg-[#09090B] hover:bg-[#0f0f11] border border-[#1C1C1F] rounded-full flex justify-center items-center"
            onClick={onClick}
        >
            <motion.div className="w-full h-full bg-[#09090B] hover:bg-[#0f0f11] rounded-full flex justify-center items-center"
                variants={{
                    hover: {
                        rotate: [0, 25, -25, 20, -20, 0],
                        transition: { duration: 0.5 },
                    },
                }}
                >
                    <Image src={iconSrc} alt="" className={className} width={48} height={48} preload={true}/>
            </motion.div>
        </motion.button>
    );
};