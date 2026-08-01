'use client'

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center relative">
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
      >
        <ArrowLeft size={20} className="text-foreground" />
      </button>
      <div className="w-full h-full flex items-center justify-center">
          <p className="text-foreground">Profile Page</p>
      </div>
    </div>
  );
}
