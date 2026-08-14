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
    <div className="flex min-h-dvh w-full items-center justify-center bg-background p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-border bg-card p-6 text-center sm:p-10"
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
    <Suspense fallback={<div className="min-h-dvh w-full bg-background" />}>
      <ErrorContent />
    </Suspense>
  );
}
