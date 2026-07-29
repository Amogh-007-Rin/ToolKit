import { Spool } from "lucide-react";
import Image from "next/image";

export default function ProfilePage() {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-lg bg-[#1D1D1D] rounded-3xl border border-[#2A2A2A] p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-black ring-2 ring-[#2A2A2A] flex items-center justify-center mb-4 overflow-hidden">
            <Image src="/github.svg" alt="" width={48} height={48} />
          </div>
          <h1 className="text-2xl text-white font-bold">John Doe</h1>
          <p className="text-gray-500 text-sm mt-1">johndoe@example.com</p>
        </div>
        <div className="space-y-3">
          <div className="bg-[#252525] rounded-xl p-4 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Member since</span>
            <span className="text-white text-sm font-medium">January 2025</span>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Tools created</span>
            <span className="text-white text-sm font-medium">12</span>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Account type</span>
            <span className="text-[#9D6FFF] text-sm font-medium">Pro</span>
          </div>
        </div>
      </div>
    </div>
  );
}
