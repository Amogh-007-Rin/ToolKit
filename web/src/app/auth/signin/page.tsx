'use client'

import { Suspense } from "react";
import AuthSignInButton from "@/components/ui/buttons/AuthSignInButton";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

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
        <div className="w-screen h-screen flex justify-center items-center gap-6 bg-black">
            {Object.entries(AuthVarients).map(([variant, { provider }]) => (
                <AuthSignInButton
                    key={provider}
                    variant={variant as "github" | "google" | "discord" | "linkedin"}
                    onClick={() => signIn(provider, { callbackUrl })}
                />
            ))}
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="w-screen h-screen bg-black" />}>
            <SignInContent />
        </Suspense>
    );
};
