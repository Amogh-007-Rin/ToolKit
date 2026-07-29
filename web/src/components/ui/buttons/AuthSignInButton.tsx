'use client'

import { motion } from "framer-motion";
import Image from "next/image";

type AuthVariant = "github" | "google" | "discord" | "linkedin";

const authConfig: Record<AuthVariant, { iconSrc: string; name: string; iconSize: number }> = {
  github: { iconSrc: "/github.svg", name: "GitHub", iconSize: 48 },
  google: { iconSrc: "/google.svg", name: "Google", iconSize: 40 },
  discord: { iconSrc: "/discord.svg", name: "Discord", iconSize: 40 },
  linkedin: { iconSrc: "/linkedin.svg", name: "LinkedIn", iconSize: 36 },
};

interface AuthSignInButtonProps {
    variant: AuthVariant;
    onClick: () => void;
}

export default function AuthSignInButton({ variant, onClick }: AuthSignInButtonProps) {
    const config = authConfig[variant];

    return (
        <motion.button
            whileHover="hover"
            className="w-24 h-24 bg-[#09090B] hover:bg-[#0f0f11] border border-[#1C1C1F] rounded-full flex justify-center items-center"
            onClick={onClick}
        >
            <motion.div
                className="w-full h-full bg-[#09090B] hover:bg-[#0f0f11] rounded-full flex justify-center items-center"
                variants={{
                    hover: {
                        rotate: [0, 25, -25, 20, -20, 0],
                        transition: { duration: 0.5 },
                    },
                }}
            >
                <Image src={config.iconSrc} alt={config.name} width={config.iconSize} height={config.iconSize} preload />
            </motion.div>
        </motion.button>
    );
}
