'use client'

import { Funnel, ListFilter, Search } from "lucide-react";
import { motion } from "framer-motion";

interface ToolSearchbarProps {
    value: string;
    onChange: (value: string) => void;
}

export default function ToolSearchbar({ value, onChange }: ToolSearchbarProps) {
    return (
        <div className="searchbar w-[99%] h-[70%] bg-card rounded-2xl flex">
            <motion.div className="part-1 h-full w-[7%] flex items-center justify-center rounded-l-2xl"
                whileHover="hover">
                <motion.div className="w-full h-full flex items-center justify-center rounded-l-2xl" variants={{
                    hover: {
                        rotate: [0, 25, -25, 20, -20, 0],
                        transition: { duration: 0.5 },
                    },
                }}>
                    <Search size={20} className="text-foreground" />
                </motion.div>
            </motion.div>
            <input
                type="search"
                placeholder="Search Tools..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="searchbar-input h-full w-[68%] bg-transparent focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none [&::-ms-clear]:hidden"
            />
            <div className="part-3 w-[25%] h-full rounded-r-2xl flex items-center justify-end px-2 py-1">
                <button className="sort-by w-[50%] h-[90%] flex items-center justify-center
                gap-1">
                    <ListFilter size={16} className="text-foreground" />
                    <p className="text-foreground text-sm hover:text-muted-foreground">Sort by</p>
                </button>
                <button className="sort-by w-[50%] h-[90%] rounded-r-2xl flex items-center justify-center gap-1">
                    <Funnel size={16} className="text-foreground" />
                    <p className="text-foreground text-sm hover:text-muted-foreground">Filters</p>
                </button>
            </div>
        </div>
    );
}
