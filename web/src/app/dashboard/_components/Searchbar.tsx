'use client'

import { useState } from "react";
import { Check, ChevronDown, Funnel, ListFilter, Search } from "lucide-react";
import { motion } from "framer-motion";

interface SearchbarProps {
    value: string;
    onChange: (value: string) => void;
    sortValue: string;
    onSortChange: (value: string) => void;
    sortOptions: { value: string; label: string }[];
    activeFilters: string[];
    onFilterToggle: (value: string) => void;
    onClearFilters: () => void;
    filterOptions: { value: string; label: string }[];
}

export default function Searchbar({ value, onChange, sortValue, onSortChange, sortOptions, activeFilters, onFilterToggle, onClearFilters, filterOptions }: SearchbarProps) {
    const [sortOpen, setSortOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const activeSort = sortOptions.find((option) => option.value === sortValue)?.label ?? "Sort by";

    return (
        <div className="searchbar flex h-12 w-full min-w-0 rounded-2xl bg-card sm:h-14">
            <motion.div className="part-1 flex h-full w-11 shrink-0 items-center justify-center rounded-l-2xl sm:w-14"
                whileHover="hover">
                <motion.div className="w-full h-full flex items-center justify-center" variants={{
                    hover: {
                        rotate: [0, 25, -25, 20, -20, 0],
                        transition: { duration: 0.5 },
                    },
                }}>
                    <Search size={22} className="text-foreground sm:size-7" />
                </motion.div>
            </motion.div>
            <input
                type="search"
                placeholder="Search Tools..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="searchbar-input h-full min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 sm:text-lg [&::-webkit-search-cancel-button]:appearance-none [&::-ms-clear]:hidden"
            />
            <div className="part-3 flex h-full shrink-0 items-center justify-end gap-0 rounded-r-2xl px-1 py-1 sm:gap-1 sm:px-2">
                <div className="relative w-auto h-[90%]">
                    <button
                        type="button"
                        onClick={() => {
                            setSortOpen((open) => !open);
                            setFilterOpen(false);
                        }}
                        className="sort-by w-full h-full px-2 flex items-center justify-center gap-1 cursor-pointer"
                    >
                        <ListFilter size={17} className="text-foreground" />
                        <span className="hidden max-w-24 truncate text-sm text-foreground md:inline">{activeSort}</span>
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                    </button>
                    {sortOpen && (
                        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-48 rounded-2xl border border-border bg-card p-1.5 shadow-lg">
                            {sortOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onSortChange(option.value);
                                        setSortOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-muted cursor-pointer"
                                >
                                    {option.label}
                                    {sortValue === option.value && <Check size={14} className="text-primary" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="relative w-auto h-[90%]">
                    <button
                        type="button"
                        onClick={() => {
                            setFilterOpen((open) => !open);
                            setSortOpen(false);
                        }}
                        className="sort-by w-full h-full px-2 rounded-r-2xl flex items-center justify-center gap-1 cursor-pointer"
                    >
                        <Funnel size={17} className="text-foreground" />
                        <span className="hidden text-sm text-foreground sm:inline">Filters</span>
                        {activeFilters.length > 0 && (
                            <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                                {activeFilters.length}
                            </span>
                        )}
                    </button>
                    {filterOpen && (
                        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-lg">
                            <div className="flex items-center justify-between px-2 py-1.5">
                                <span className="text-xs font-semibold text-foreground">Filter collections</span>
                                {activeFilters.length > 0 && (
                                    <button type="button" onClick={onClearFilters} className="text-xs text-primary cursor-pointer">Clear</button>
                                )}
                            </div>
                            {filterOptions.map((option) => {
                                const active = activeFilters.includes(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => onFilterToggle(option.value)}
                                        className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-muted cursor-pointer"
                                    >
                                        {option.label}
                                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                                            {active && <Check size={11} />}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
