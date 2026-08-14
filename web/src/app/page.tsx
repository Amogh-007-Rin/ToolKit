'use client'

import Appbar from "@/components/ui/Appbar";
import Spinner from "@/components/ui/loaders/Spinner";

export default function Home() {

  return (
    <div className="w-screen h-screen bg-background ">
      <Appbar/>
      <div className="w-full h-[80%] flex items-center justify-center">
        <Spinner/>
      </div>
      
    </div>
  );
};
