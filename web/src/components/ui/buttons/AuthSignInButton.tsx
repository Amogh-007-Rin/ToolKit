'use client'

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import Spinner from "@/components/ui/loaders/Spinner";

type AuthVariant = "github" | "google" | "discord" | "linkedin";

const authConfig: Record<AuthVariant, { iconSrc: string; name: string; iconSize: number }> = {
  github: { iconSrc: "/github.png", name: "GitHub", iconSize: 48 },
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
    onClick: () => void | Promise<void>;
    disabled?: boolean;
    loading?: boolean;
}

export default function AuthSignInButton({ variant, onClick, disabled = false, loading = false }: AuthSignInButtonProps) {
    const config = authConfig[variant];

    return (
        <motion.button
            type="button"
            className="w-16 h-16 bg-card hover:bg-muted border border-border rounded-full flex justify-center items-center disabled:opacity-45 disabled:cursor-not-allowed"
            initial="rest"
            whileHover="hover"
            animate="rest"
            onClick={onClick}
            disabled={disabled}
            aria-label={`Continue with ${config.name}`}
            aria-busy={loading}
        >
            <motion.div
                className="w-full h-full bg-card hover:bg-muted rounded-full flex justify-center items-center"
                variants={iconVariants}
            >
                {loading ? <Spinner size="sm" label={`Connecting to ${config.name}`} /> : <Image src={config.iconSrc} alt="" width={config.iconSize} height={config.iconSize} preload />}
            </motion.div>
        </motion.button>
    );
}
