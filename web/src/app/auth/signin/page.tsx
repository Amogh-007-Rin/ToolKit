'use client'

import { Suspense } from "react";
import AuthSignInButton from "@/components/ui/buttons/AuthSignInButton";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";


function SignInContent() {

    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/auth/signin"

    return (
        <div className="w-screen h-screen flex justify-center items-center bg-black">
            <AuthSignInButton tag="githubAuthButton" iconSrc="/github.svg" className="w-14 h-14"
                onClick={() => signIn("github", { callbackUrl })}
            />
            <AuthSignInButton tag="googlehubAuthButton" iconSrc="/google.svg" className="w-12 h-12"
                onClick={() => signIn("google", { callbackUrl })}
            />
            <AuthSignInButton tag="discordAuthButton" iconSrc="/discord.svg" className="w-12 h-12"
                onClick={() => signIn("discord", { callbackUrl })}
            />
            <AuthSignInButton tag="linkedInAuthButton" iconSrc="/linkedin.svg" className="w-10 h-10"
                onClick={() => signIn("linkedin", { callbackUrl })}
            />
        </div>
    );
};

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="w-screen h-screen bg-black" />}>
            <SignInContent />
        </Suspense>
    );
};