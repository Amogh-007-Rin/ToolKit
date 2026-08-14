'use client'

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Lenis from "lenis";
import { ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCollections } from "../../_components/CollectionsProvider";
import { TOOL_ICONS } from "../../_components/tool-icons";
import AddToolCard from "../../_components/cards/AddToolCard";
import ConfirmDeleteCard from "../../_components/cards/ConfirmDeleteCard";
import ToolSearchbar from "../../_components/ToolSearchbar";
import Spinner from "@/components/ui/loaders/Spinner";
import Image from "next/image";
import type { Tool } from "@/types/collections";

const TOOL_SORT_OPTIONS = [
    { value: "recent", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
];
const TOOL_FILTER_OPTIONS = [
    { value: "ai", label: "AI-saved" },
    { value: "manual", label: "Manually added" },
    { value: "has-link", label: "Has website link" },
    { value: "missing-link", label: "Missing link" },
    { value: "missing-metadata", label: "Missing metadata" },
];

function displayHost(link: string): string {
    try {
        return new URL(link).hostname.replace(/^www\./, "");
    } catch {
        return link;
    }
}

export default function CollectionDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { collections, loading, addTool, updateTool, deleteTool } = useCollections();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Tool | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("recent");
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [scrollable, setScrollable] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const railRef = useRef<HTMLDivElement>(null);
    const barFillRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const wrapper = scrollRef.current;
        const content = contentRef.current;
        if (!wrapper || !content) return;

        const lenis = new Lenis({
            wrapper,
            content,
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            syncTouch: true,
            autoRaf: true,
        });
        const updateBar = (scroll: number, limit: number) => {
            const rail = railRef.current;
            const fill = barFillRef.current;
            if (!rail || !fill) return;
            setScrollable(limit > 0);
            const progress = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0;
            const travel = rail.clientHeight * 0.93;
            fill.style.transform = `translateY(${progress * travel}px)`;
        };
        const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => {
            updateBar(scroll, limit);
        };
        lenis.on("scroll", onScroll);
        updateBar(0, lenis.limit);

        const resizeObserver = new ResizeObserver(() => {
            lenis.resize();
            updateBar(lenis.scroll, lenis.limit);
        });
        resizeObserver.observe(wrapper);
        resizeObserver.observe(content);

        return () => {
            lenis.off("scroll", onScroll);
            resizeObserver.disconnect();
            lenis.destroy();
        };
    }, [loading]);

    const collection = collections.find((c) => c.id === params.id);
    const filteredTools = (collection?.tools ?? []).filter((tool) => {
        const query = searchQuery.trim().toLowerCase();
        if (query && !tool.name.toLowerCase().includes(query)) return false;
        const isAiSaved = Boolean(tool.description || tool.reason);
        if (activeFilters.includes("ai") && !isAiSaved) return false;
        if (activeFilters.includes("manual") && isAiSaved) return false;
        if (activeFilters.includes("has-link") && !tool.link) return false;
        if (activeFilters.includes("missing-link") && tool.link) return false;
        if (activeFilters.includes("missing-metadata") && tool.description && tool.reason) return false;
        return true;
    });
    const sortedTools = [...filteredTools].sort((a, b) => {
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortBy === "oldest" ? aTime - bTime : bTime - aTime;
    });

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <Spinner size="lg" className="scale-125" label="Loading collection tools" />
            </div>
        );
    }

    if (!collection) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <p className="text-foreground text-xl">Collection not found</p>
                <button
                    onClick={() => router.push("/dashboard/tools")}
                    className="h-11 px-6 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors cursor-pointer"
                >
                    Back to tools
                </button>
            </div>
        );
    }

    const handleAddTool = (tool: Omit<Tool, "id">) => {
        addTool(collection.id, tool);
        setIsAddOpen(false);
    };

    const handleUpdateTool = (tool: Omit<Tool, "id">) => {
        if (editingTool) {
            updateTool(collection.id, editingTool.id, tool);
        }
        setEditingTool(null);
    };

    const handleConfirmDelete = () => {
        if (deleteTarget) {
            deleteTool(collection.id, deleteTarget.id);
        }
        setDeleteTarget(null);
    };

    const handleFilterToggle = (value: string) => {
        setActiveFilters((current) => {
            if (current.includes(value)) return current.filter((filter) => filter !== value);
            const opposites: Record<string, string> = {
                ai: "manual",
                manual: "ai",
                "has-link": "missing-link",
                "missing-link": "has-link",
            };
            const withoutOpposite = current.filter((filter) => filter !== opposites[value]);
            return [...withoutOpposite, value];
        });
    };

    return (
        <div className="relative flex h-full min-h-0 w-full flex-col">
            <div className="part-1 flex w-full shrink-0 items-start justify-between gap-3 px-3 py-3 sm:items-center sm:px-5">
                <div className="min-w-0 flex flex-col gap-1">
                    <p className="truncate text-xl text-foreground tracking-wide sm:text-2xl">{collection.title}</p>
                    {collection.description && (
                        <p className="text-sm text-muted-foreground">{collection.description}</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsAddOpen(true)}
                        className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:h-11 sm:px-5"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Add tools</span>
                    </motion.button>
                    <motion.button
                        onClick={() => router.push("/dashboard/tools")}
                        whileHover={{ rotate: 90 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="w-11 h-11 bg-card border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </motion.button>
                </div>
            </div>
            <div className="part-2 flex w-full shrink-0 flex-col gap-2 px-3 pb-2 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                <div className="flex shrink-0 items-center gap-3">
                    <p className="text-lg text-foreground font-semibold">Tools</p>
                    <span className="text-sm text-muted-foreground">
                        {collection.tools.length} {collection.tools.length === 1 ? "tool" : "tools"}
                    </span>
                </div>
                <div className="flex w-full flex-1 items-center justify-end">
                    <div className="flex w-full items-center lg:w-3/5">
                        <ToolSearchbar
                            value={searchQuery}
                            onChange={setSearchQuery}
                            sortValue={sortBy}
                            onSortChange={setSortBy}
                            sortOptions={TOOL_SORT_OPTIONS}
                            activeFilters={activeFilters}
                            onFilterToggle={handleFilterToggle}
                            onClearFilters={() => setActiveFilters([])}
                            filterOptions={TOOL_FILTER_OPTIONS}
                        />
                    </div>
                </div>
            </div>
            <div ref={scrollRef} data-lenis-wrapper className="part-3 min-h-0 w-full flex-1 overflow-y-auto scrollbar-none">
              <div ref={contentRef} className="min-h-full p-4">
                {collection.tools.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-lg">
                            No tools yet. Click &quot;Add tools&quot; to add your first tool.
                        </p>
                    </div>
                ) : filteredTools.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-lg">
                            No tools match &quot;{searchQuery.trim()}&quot;.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                        {sortedTools.map((tool) => {
                            const Icon = TOOL_ICONS[tool.icon] ?? TOOL_ICONS.sparkles;
                            return (
                                <div
                                    key={tool.id}
                                    onClick={() => {
                                        if (tool.link) window.open(tool.link, "_blank", "noopener,noreferrer");
                                    }}
                                    className={`group relative min-h-64 overflow-hidden bg-linear-to-br from-card via-card to-primary/6 border border-border/80 rounded-3xl p-5 flex flex-col gap-5 transition-all duration-300 ${
                                        tool.link ? "cursor-pointer hover:-translate-y-1 hover:border-primary/40" : ""
                                    }`}
                                >
                                    <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl opacity-60 transition-opacity group-hover:opacity-100" />
                                    <div className="relative flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative w-12 h-12 rounded-2xl border border-border/70 bg-transparent flex items-center justify-center overflow-hidden shrink-0">
                                            {tool.logoUrl ? (
                                                <Image
                                                    src={tool.logoUrl}
                                                    fill
                                                    sizes="48px"
                                                    alt={tool.name}
                                                    unoptimized
                                                    className="object-contain"
                                                />
                                            ) : (
                                                <Icon size={22} className="text-primary" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <p className="text-lg text-foreground font-semibold truncate">{tool.name}</p>
                                            {tool.link && (
                                                <p className="mt-0.5 text-xs text-muted-foreground truncate">{displayHost(tool.link)}</p>
                                            )}
                                        </div>
                                      </div>
                                      {tool.link && (
                                        <div className="w-8 h-8 rounded-full border border-border/70 bg-background/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors shrink-0">
                                            <ExternalLink size={14} />
                                        </div>
                                      )}
                                    </div>
                                    {(tool.description || tool.reason) && (
                                      <div className="relative flex flex-col gap-3">
                                        {tool.description && (
                                          <p className="text-sm leading-5 text-muted-foreground line-clamp-2">
                                            {tool.description}
                                          </p>
                                        )}
                                        {tool.reason && (
                                          <div className="rounded-2xl border border-primary/10 bg-primary/6 px-3 py-2.5">
                                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                                              Use case
                                            </p>
                                            <p className="text-xs leading-4 text-foreground/80 line-clamp-2">
                                              {tool.reason}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="relative mt-auto flex items-center justify-between border-t border-border/70 pt-3">
                                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                                        {tool.link ? "Open tool" : "Saved tool"}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingTool(tool);
                                            }}
                                            aria-label={`Edit ${tool.name}`}
                                            className="w-8 h-8 rounded-lg bg-background/50 border border-border/70 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget(tool);
                                            }}
                                            aria-label={`Delete ${tool.name}`}
                                            className="w-8 h-8 rounded-lg bg-background/50 border border-border/70 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                      </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
              </div>
            </div>
            <div
                ref={railRef}
                className={`absolute right-1 top-[21%] bottom-4 w-1 rounded-full bg-transparent overflow-hidden pointer-events-none transition-opacity duration-300 ${
                    scrollable ? "opacity-100" : "opacity-0"
                }`}
            >
                <div ref={barFillRef} className="w-full h-[7%] rounded-full bg-foreground" />
            </div>
            <AddToolCard
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSubmit={handleAddTool}
            />
            <AddToolCard
                isOpen={editingTool !== null}
                onClose={() => setEditingTool(null)}
                onSubmit={handleUpdateTool}
                initialTool={editingTool}
            />
            <ConfirmDeleteCard
                isOpen={deleteTarget !== null}
                title={deleteTarget?.name ?? ""}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};
