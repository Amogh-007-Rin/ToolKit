'use client'

import Appbar from "@/components/ui/Appbar";
import Spinner from "@/components/ui/loaders/Spinner";

export default function Home() {

  return (
    <div className="min-h-dvh w-full bg-background">
      <Appbar/>
      <div className="flex min-h-[80dvh] w-full items-center justify-center">
        <Spinner/>
      </div>
      
    </div>
  );
};
