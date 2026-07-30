'use client'

import { useState } from "react";
import AuthSignInButton from "@/components/ui/buttons/AuthSignInButton";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
    const [isSignUp, setIsSignUp] = useState(true);

    return (
        <div className="w-screen h-screen bg-black flex overflow-hidden">
            <div className={`${isSignUp ? "w-[60%]" : "w-[40%]"} h-full flex items-center justify-center p-4 transition-all duration-500`}>
                <AnimatePresence mode="wait">
                    {isSignUp ? (
                        <motion.div
                            key="signup-form"
                            initial={{ opacity: 0, rotateY: -90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: 90 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="w-[55%] h-[85%] bg-[#1D1D1D] rounded-3xl flex flex-col border border-[#2A2A2A]"
                        >
                            <div className="w-full h-[20%] flex items-center justify-center">
                                <h1 className="text-4xl text-white font-bold tracking-tight">Create account</h1>
                            </div>
                            <div className="w-full h-[10%] flex items-center justify-center">
                                <p className="text-gray-500 text-sm">Let&apos;s get started with your 30 days trial</p>
                            </div>
                            <div className="w-full h-[25%] flex flex-col items-center justify-center gap-4 px-10">
                                <input type="text" placeholder="Name" className="w-full h-12 bg-[#252525] border border-[#2A2A2A] rounded-xl px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#9D6FFF] transition-colors" />
                                <input type="email" placeholder="Email" className="w-full h-12 bg-[#252525] border border-[#2A2A2A] rounded-xl px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#9D6FFF] transition-colors" />
                                <input type="password" placeholder="Password" className="w-full h-12 bg-[#252525] border border-[#2A2A2A] rounded-xl px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#9D6FFF] transition-colors" />
                            </div>
                            <div className="w-full h-[10%] flex items-center justify-center">
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-[86%] h-[60%] bg-[#9D6FFF] rounded-xl text-white font-medium text-sm hover:bg-[#8a5fe8] transition-colors cursor-pointer">
                                    Create account
                                </motion.button>
                            </div>
                            <div className="w-full h-[5%] flex items-center justify-center">
                                <p className="text-gray-500 text-sm">
                                    Already have an account?{" "}
                                    <button onClick={() => setIsSignUp(false)} className="text-[#9D6FFF] hover:text-[#b088ff] transition-colors cursor-pointer bg-transparent border-none">
                                        Login
                                    </button>
                                </p>
                            </div>
                            <div className="w-full h-[20%] flex items-center justify-center">
                                <div className="flex items-center gap-4">
                                    {Object.entries(AuthVarients).map(([variant, { provider }]) => (
                                        <AuthSignInButton key={provider} variant={variant as "github" | "google" | "discord" | "linkedin"} onClick={() => signIn(provider, { callbackUrl })} />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="signin-image"
                            initial={{ opacity: 0, rotateY: 90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: -90 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full h-full relative overflow-hidden rounded-2xl"
                        >
                            <Image src="/authpage-image.jpg" alt="" fill className="object-cover" priority sizes="60vw" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className={`${isSignUp ? "w-[40%]" : "w-[60%]"} h-full flex items-center justify-center p-4 transition-all duration-500`}>
                <AnimatePresence mode="wait">
                    {isSignUp ? (
                        <motion.div
                            key="signup-image"
                            initial={{ opacity: 0, rotateY: 90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: -90 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full h-full relative overflow-hidden rounded-2xl"
                        >
                            <Image src="/authpage-image.jpg" alt="" fill className="object-cover" priority sizes="60vw" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="signin-form"
                            initial={{ opacity: 0, rotateY: -90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: 90 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="w-[55%] h-[85%] bg-[#1D1D1D] rounded-3xl flex flex-col border border-[#2A2A2A] p-10 gap-6"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <h1 className="text-3xl text-white font-bold tracking-tight">Welcome back</h1>
                                <p className="text-gray-500 text-sm">Sign in to your account</p>
                            </div>
                            <div className="flex flex-col gap-4">
                                <input type="email" placeholder="Email" className="w-full h-12 bg-[#252525] border border-[#2A2A2A] rounded-xl px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#9D6FFF] transition-colors" />
                                <input type="password" placeholder="Password" className="w-full h-12 bg-[#252525] border border-[#2A2A2A] rounded-xl px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#9D6FFF] transition-colors" />
                            </div>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full h-12 bg-[#9D6FFF] rounded-xl text-white font-medium text-sm hover:bg-[#8a5fe8] transition-colors cursor-pointer">
                                Sign in
                            </motion.button>
                            <p className="text-gray-500 text-sm text-center">
                                Don&apos;t have an account?{" "}
                                <button onClick={() => setIsSignUp(true)} className="text-[#9D6FFF] hover:text-[#b088ff] transition-colors cursor-pointer bg-transparent border-none">
                                    Sign up
                                </button>
                            </p>
                            <div className="flex items-center justify-center gap-4 pt-2">
                                {Object.entries(AuthVarients).map(([variant, { provider }]) => (
                                    <AuthSignInButton key={provider} variant={variant as "github" | "google" | "discord" | "linkedin"} onClick={() => signIn(provider, { callbackUrl })} />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
