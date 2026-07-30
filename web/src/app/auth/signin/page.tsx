'use client'

import AuthSignInButton from "@/components/ui/buttons/AuthSignInButton";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Spool } from "lucide-react";
import Image from "next/image";

const AuthVarients = {
    github: { provider: "github" as const },
    google: { provider: "google" as const },
    discord: { provider: "discord" as const },
    linkedin: { provider: "linkedin" as const },
};

function SignInContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    return (
        <div className="w-screen h-screen bg-black flex">
            <div className="part-signin w-[60%] h-full flex items-center justify-center">
                <div className="signin-card w-[50%] h-[80%] rounded-3xl flex flex-col border">
                    <div className="part-1 w-full h-[20%] flex items-center justify-center">
                        <h1 className="text-5xl text-white font-medium tracking-wide">Create account</h1>
                    </div>
                    <div className="part-2 w-full h-[10%] flex flex-col justify-end px-12 py-2">
                        <p className="text-gray-500 text-sm">Let&apos;s get started with your 30 days trial</p>
                    </div>
                    <div className="part-3 w-full h-[25%] flex flex-col items-center justify-start gap-4 px-10">
                        <input
                            type="text"
                            placeholder="Name"
                            className="w-full h-12 bg-[#252525] border border-[#2A2A2A] rounded-xl px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#9D6FFF] transition-colors"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full h-12 bg-[#252525] border border-[#2A2A2A] rounded-xl px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#9D6FFF] transition-colors"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full h-12 bg-[#252525] border border-[#2A2A2A] rounded-xl px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#9D6FFF] transition-colors"
                        />
                    </div>
                    <div className="part-5 w-full h-[10%] flex items-center justify-center">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-[86%] h-[60%] bg-[#9D6FFF] rounded-xl text-white font-medium text-sm hover:bg-[#8a5fe8] transition-colors cursor-pointer"
                        >
                            Create account
                        </motion.button>
                    </div>
                    <div className="part-4 w-full h-[5%] flex items-start justify-start px-14">
                        <p className="text-gray-500 text-sm">
                            Already have an account?{" "}
                            <a href="#" className="text-[#9D6FFF] hover:text-[#b088ff] transition-colors">Login</a>
                        </p>
                    </div>
                    <div className="part-6 w-full h-[20%] flex items-center justify-center">
                        <div className="flex items-center gap-4">
                            {Object.entries(AuthVarients).map(([variant, { provider }]) => (
                                <AuthSignInButton
                                    key={provider}
                                    variant={variant as "github" | "google" | "discord" | "linkedin"}
                                    onClick={() => signIn(provider, { callbackUrl })}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="part-signup w-[40%] h-full flex items-center justify-center p-4">
                <div className="w-full h-full relative overflow-hidden rounded-2xl">
                    <Image src={"/authpage-image.jpg"} alt="" fill className="object-cover" priority />
                </div>
            </div>

        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="w-screen h-screen bg-black" />}>
            <SignInContent />
        </Suspense>
    );
}
