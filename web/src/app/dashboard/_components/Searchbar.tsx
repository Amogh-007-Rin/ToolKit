'use client'

import { Funnel, ListFilter, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function Searchbar() {
    return (
        <div className="searchbar w-[99%] h-[90%] bg-card rounded-2xl flex">
            <motion.div className="part-1 h-full w-[5%] flex items-center justify-center rounded-l-2xl"
                whileHover="hover">
                <motion.div className="w-full h-full flex items-center justify-center" variants={{
                    hover: {
                        rotate: [0, 25, -25, 20, -20, 0],
                        transition: { duration: 0.5 },
                    },
                }}>
                    <Search size={32} className="text-foreground" />
                </motion.div>
            </motion.div>
            <input type="search" placeholder="Search Tools..." className="searchbar-input h-full w-[70%] bg-transparent focus:outline-none focus:ring-0 text-lg text-foreground placeholder:text-muted-foreground" />
            <div className="part-3 w-[25%] h-full rounded-r-2xl flex items-center justify-end px-2 py-1">
                <button className="sort-by w-[25%] h-[90%] flex items-center justify-center
                gap-1">
                    <ListFilter size={17} className="text-foreground" />
                    <p className="text-foreground text-lg hover:text-muted-foreground">Sort by</p>
                </button>
                <button className="sort-by w-[25%] h-[90%] rounded-r-2xl flex items-center justify-center gap-1">
                    <Funnel size={17} className="text-foreground" />
                    <p className="text-foreground text-lg hover:text-muted-foreground">Filters</p>
                </button>
            </div>
        </div>
    );
}
