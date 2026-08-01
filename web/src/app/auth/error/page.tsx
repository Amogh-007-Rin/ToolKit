'use client'

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  Configuration: {
    title: "Server configuration error",
    message: "The authentication server is not configured correctly. Please contact the administrator.",
  },
  AccessDenied: {
    title: "Access denied",
    message: "You do not have permission to sign in with this account.",
  },
  Verification: {
    title: "Verification error",
    message: "The sign in link is invalid or has expired. Please try again.",
  },
  Default: {
    title: "Sign in failed",
    message: "Something went wrong while signing you in. Please try again.",
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error") ?? "Default";
  const config = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-[90%] max-w-md bg-card border border-border rounded-3xl p-10 flex flex-col items-center gap-6 text-center"
      >
        <h1 className="text-3xl text-foreground font-bold tracking-tight">{config.title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{config.message}</p>
        <Link
          href="/auth/signin"
          className="w-full h-12 flex items-center justify-center bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="w-screen h-screen bg-background" />}>
      <ErrorContent />
    </Suspense>
  );
}
