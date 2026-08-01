'use client'

import { useState } from "react";
import AuthSignInButton from "@/components/ui/buttons/AuthSignInButton";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

const AuthVarients = {
    github: { provider: "github" as const },
    google: { provider: "google" as const },
    discord: { provider: "discord" as const },
    linkedin: { provider: "linkedin" as const },
};

function SignInContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
    const [isSignUp, setIsSignUp] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleOAuthSignIn = (provider: string) => {
        signIn(provider, { callbackUrl });
    };

    const handleCreateAccount = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setError(data?.error ?? "Registration failed");
                return;
            }
            const result = await signIn("credentials", { email, password, redirect: false });
            if (result?.error) {
                setError("Could not sign you in after registration");
                return;
            }
            router.push(callbackUrl);
        } catch {
            setError("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        const result = await signIn("credentials", { email, password, redirect: false });
        setIsLoading(false);
        if (result?.error) {
            setError("Invalid email or password");
            return;
        }
        router.push(callbackUrl);
    };

    return (
        <div className="w-screen h-screen bg-background flex overflow-hidden">
            <div className={`${isSignUp ? "w-[60%]" : "w-[40%]"} h-full flex items-center justify-center p-4 transition-all duration-500`}>
                <AnimatePresence mode="wait">
                    {isSignUp ? (
                        <motion.div
                            key="signup-form"
                            initial={{ opacity: 0, rotateY: -90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: 90 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="w-[55%] h-[85%] bg-card rounded-3xl flex flex-col border border-border"
                        >
                            <div className="w-full h-[20%] flex items-center justify-center">
                                <h1 className="text-4xl text-foreground font-bold tracking-tight">Create account</h1>
                            </div>
                            <div className="w-full h-[10%] flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">Let&apos;s get started with your 30 days trial</p>
                            </div>
                            <div className="w-full h-[25%] flex flex-col items-center justify-center gap-4 px-10">
                                <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                            </div>
                            <div className="w-full h-[10%] flex flex-col items-center justify-center gap-1">
                                {error && <p className="text-destructive text-sm">{error}</p>}
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreateAccount} disabled={isLoading} className="w-[86%] h-[60%] bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer">
                                    {isLoading ? "Creating account..." : "Create account"}
                                </motion.button>
                            </div>
                            <div className="w-full h-[5%] flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">
                                    Already have an account?{" "}
                                    <button onClick={() => setIsSignUp(false)} className="text-primary hover:text-primary/90 transition-colors cursor-pointer bg-transparent border-none">
                                        Login
                                    </button>
                                </p>
                            </div>
                            <div className="w-full h-[20%] flex items-center justify-center">
                                <div className="flex items-center gap-4">
                                    {Object.entries(AuthVarients).map(([variant, { provider }]) => (
                                        <AuthSignInButton key={provider} variant={variant as "github" | "google" | "discord" | "linkedin"} onClick={() => handleOAuthSignIn(provider)} />
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
                            className="w-[55%] h-[85%] bg-card rounded-3xl flex flex-col border border-border p-10 gap-6"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <h1 className="text-3xl text-foreground font-bold tracking-tight">Welcome back</h1>
                                <p className="text-muted-foreground text-sm">Sign in to your account</p>
                            </div>
                            <div className="flex flex-col gap-4">
                                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                            </div>
                            {error && <p className="text-destructive text-sm text-center">{error}</p>}
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSignIn} disabled={isLoading} className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer">
                                {isLoading ? "Signing in..." : "Sign in"}
                            </motion.button>
                            <p className="text-muted-foreground text-sm text-center">
                                Don&apos;t have an account?{" "}
                                <button onClick={() => setIsSignUp(true)} className="text-primary hover:text-primary/90 transition-colors cursor-pointer bg-transparent border-none">
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
        <Suspense fallback={<div className="w-screen h-screen bg-background" />}>
            <SignInContent />
        </Suspense>
    );
}
