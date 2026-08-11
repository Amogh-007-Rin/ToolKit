'use client'

import Appbar from "@/components/ui/Appbar";
import Spinner from "@/components/ui/loaders/Spinner";

export default function Home() {

  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center">
      {/* <Appbar/> */}
      <Spinner/>
    </div>
  );
};
