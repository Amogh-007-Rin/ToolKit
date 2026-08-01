'use client'

import { useState } from "react";
import ToolCollectionCard from "./dashboard/_components/cards/ToolCollectionCard";

export default function Home() {
  const [isCardOpen, setIsCardOpen] = useState(true);

  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center">
      <ToolCollectionCard
        isOpen={isCardOpen}
        onClose={() => setIsCardOpen(false)}
        onSubmit={() => setIsCardOpen(false)}
      />
    </div>
  );
};
