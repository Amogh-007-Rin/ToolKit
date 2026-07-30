'use client'

import { motion, type Variants } from "framer-motion";
import Image from "next/image";

type AuthVariant = "github" | "google" | "discord" | "linkedin";

const authConfig: Record<AuthVariant, { iconSrc: string; name: string; iconSize: number }> = {
  github: { iconSrc: "/github.svg", name: "GitHub", iconSize: 48 },
  google: { iconSrc: "/google.svg", name: "Google", iconSize: 40 },
  discord: { iconSrc: "/discord.svg", name: "Discord", iconSize: 40 },
  linkedin: { iconSrc: "/linkedin.svg", name: "LinkedIn", iconSize: 36 },
};

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

interface AuthSignInButtonProps {
    variant: AuthVariant;
    onClick: () => void;
}

export default function AuthSignInButton({ variant, onClick }: AuthSignInButtonProps) {
    const config = authConfig[variant];

    return (
        <motion.button
            className="w-16 h-16 bg-[#1D1D1D] hover:bg-[#0f0f11] border border-[#1C1C1F] rounded-full flex justify-center items-center"
            initial="rest"
            whileHover="hover"
            animate="rest"
            onClick={onClick}
        >
            <motion.div
                className="w-full h-full bg-[#1D1D1D] hover:bg-[#0f0f11] rounded-full flex justify-center items-center"
                variants={iconVariants}
            >
                <Image src={config.iconSrc} alt={config.name} width={config.iconSize} height={config.iconSize} preload />
            </motion.div>
        </motion.button>
    );
}
