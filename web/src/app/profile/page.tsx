'use client'

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center relative">
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 w-10 h-10 rounded-xl bg-[#1D1D1D] border border-[#2A2A2A] flex items-center justify-center hover:bg-[#252525] transition-colors cursor-pointer"
      >
        <ArrowLeft size={20} color="#FFFFFF" />
      </button>
      <div className="w-full h-full flex items-center justify-center">
          <p className="text-white">Profile Page</p>
      </div>
    </div>
  );
}
