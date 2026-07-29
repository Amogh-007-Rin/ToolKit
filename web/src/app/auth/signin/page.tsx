'use client'

import { Suspense } from "react";
import AuthSignInButton from "@/components/ui/buttons/AuthSignInButton";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const providers = [
  { variant: "github" as const, provider: "github" },
  { variant: "google" as const, provider: "google" },
  { variant: "discord" as const, provider: "discord" },
  { variant: "linkedin" as const, provider: "linkedin" },
];

function SignInContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    return (
        <div className="w-screen h-screen flex justify-center items-center gap-6 bg-black">
            {providers.map((p) => (
                <AuthSignInButton
                    key={p.provider}
                    variant={p.variant}
                    onClick={() => signIn(p.provider, { callbackUrl })}
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
}
