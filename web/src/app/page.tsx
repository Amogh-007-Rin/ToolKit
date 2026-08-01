'use client'

import { useState } from "react";
import ToolCollectionCard from "./dashboard/_components/cards/ToolCollectionCard";
import Appbar from "@/components/ui/Appbar";

export default function Home() {
  const [isCardOpen, setIsCardOpen] = useState(true);

  return (
    <div className="w-screen h-screen bg-background">
      <Appbar/>
    </div>
  );
};
