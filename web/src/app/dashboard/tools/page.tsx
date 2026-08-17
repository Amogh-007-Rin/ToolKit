'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Multibutton from "../_components/buttons/Multibutton";
import Searchbar from "../_components/Searchbar";
import ToolCollectionCard from "../_components/cards/ToolCollectionCard";
import ConfirmDeleteCard from "../_components/cards/ConfirmDeleteCard";
import { useCollections } from "../_components/CollectionsProvider";
import { TOOL_ICONS } from "../_components/tool-icons";
import type { Collection } from "@/types/collections";

const COLLECTION_SORT_OPTIONS = [
    { value: "recent", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
    { value: "tools-desc", label: "Most tools" },
    { value: "tools-asc", label: "Fewest tools" },
];
const COLLECTION_FILTER_OPTIONS = [
    { value: "non-empty", label: "Has tools" },
    { value: "empty", label: "Empty collections" },
    { value: "has-ai", label: "Contains AI tools" },
    { value: "recently-updated", label: "Updated in 30 days" },
];

function faviconUrl(link: string | null): string | null {
    if (!link) return null;
    try {
        const host = new URL(link).hostname;
        return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    } catch {
        return null;
    }
}

export default function ToolsPage() {
    const router = useRouter();
    const { collections, addCollection, updateCollection, deleteCollection } = useCollections();
    const [isCardOpen, setIsCardOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("recent");
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [filterReferenceTime] = useState(Date.now);

    const filteredCollections = collections.filter((c) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query || (
            c.title.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query) ||
            c.tools.some((tool) => tool.name.toLowerCase().includes(query))
        );
        if (!matchesSearch) return false;
        if (activeFilters.includes("non-empty") && c.tools.length === 0) return false;
        if (activeFilters.includes("empty") && c.tools.length > 0) return false;
        if (activeFilters.includes("has-ai") && !c.tools.some((tool) => tool.description || tool.reason)) return false;
        if (activeFilters.includes("recently-updated")) {
            const updatedAt = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
            if (filterReferenceTime - updatedAt > 30 * 24 * 60 * 60 * 1000) return false;
        }
        return true;
    });
    const sortedCollections = [...filteredCollections].sort((a, b) => {
        if (sortBy === "name-asc") return a.title.localeCompare(b.title);
        if (sortBy === "name-desc") return b.title.localeCompare(a.title);
        if (sortBy === "tools-desc") return b.tools.length - a.tools.length;
        if (sortBy === "tools-asc") return a.tools.length - b.tools.length;
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortBy === "oldest" ? aTime - bTime : bTime - aTime;
    });

    const handleAddCollection = (title: string, description: string) => {
        addCollection(title, description);
        setIsCardOpen(false);
    };

    const handleSaveCollection = (title: string, description: string) => {
        if (editingCollection) {
            updateCollection(editingCollection.id, title, description);
        }
        setEditingCollection(null);
    };

    const handleConfirmDelete = () => {
        if (deleteTarget) {
            deleteCollection(deleteTarget.id);
        }
        setDeleteTarget(null);
    };

    const handleFilterToggle = (value: string) => {
        setActiveFilters((current) => {
            if (current.includes(value)) return current.filter((filter) => filter !== value);
            const withoutOpposite = value === "empty"
                ? current.filter((filter) => filter !== "non-empty")
                : value === "non-empty"
                    ? current.filter((filter) => filter !== "empty")
                    : current;
            return [...withoutOpposite, value];
        });
    };

    return (
        <div className="flex h-full min-h-0 w-full flex-col">
            <div className="part-1 flex w-full shrink-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="left-part flex items-center">
                    <p className="text-xl text-foreground tracking-wide sm:text-2xl">My Collections</p>
                </div>
                <div className="right-part flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none sm:justify-end sm:pb-0">
                    <Multibutton tag="Add-new-collection" label="collection" onClick={() => setIsCardOpen(true)} icon={Plus}
                        className="h-10! w-auto! shrink-0 bg-primary px-3" iconClassName="text-primary-foreground" textClassName="text-primary-foreground" />
                </div>
            </div>
            <div className="part-2 flex w-full shrink-0 items-center justify-center px-2 pb-2 sm:px-3">
                <Searchbar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    sortValue={sortBy}
                    onSortChange={setSortBy}
                    sortOptions={COLLECTION_SORT_OPTIONS}
                    activeFilters={activeFilters}
                    onFilterToggle={handleFilterToggle}
                    onClearFilters={() => setActiveFilters([])}
                    filterOptions={COLLECTION_FILTER_OPTIONS}
                />
            </div>
            <div className="part-3 min-h-0 w-full flex-1 overflow-y-auto p-2 sm:p-4">
                {collections.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-lg">No collections yet. Click &quot;Add tools&quot; to create one.</p>
                    </div>
                ) : filteredCollections.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-lg">No collections match &quot;{searchQuery.trim()}&quot;.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                        {sortedCollections.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => router.push(`/dashboard/tools/${c.id}`)}
                                className="group relative min-h-56 overflow-hidden bg-linear-to-br from-card via-card to-primary/6 border border-border/80 rounded-3xl p-5 flex flex-col gap-3 cursor-pointer hover:-translate-y-1 hover:border-primary/40 transition-all duration-300"
                            >
                                <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />
                                <div className="relative flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-lg text-foreground font-semibold truncate">{c.title}</p>
                                        <span className="mt-1 inline-flex rounded-full border border-border/70 bg-background/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                            {c.tools.length} {c.tools.length === 1 ? "tool" : "tools"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCollection(c);
                                            }}
                                            className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget(c);
                                            }}
                                            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <p className="relative text-sm leading-5 text-muted-foreground line-clamp-3">{c.description || "No description"}</p>
                                {c.tools.length > 0 && (
                                    <div className="relative mt-auto pt-4 border-t border-border/70 flex items-center">
                                        <div className="flex items-center">
                                        {c.tools.slice(0, 8).map((tool) => {
                                            const Icon = TOOL_ICONS[tool.icon] ?? TOOL_ICONS.sparkles;
                                            const logoUrl = tool.logoUrl ?? faviconUrl(tool.link);
                                            return logoUrl ? (
                                                <div key={tool.id} className="relative w-8 h-8 -ml-2 first:ml-0 rounded-full overflow-hidden border-2 border-card bg-shade-background" title={tool.name}>
                                                    <Image src={logoUrl} fill sizes="32px" alt={tool.name} unoptimized className="object-contain" />
                                                </div>
                                            ) : (
                                                <div key={tool.id} className="w-8 h-8 -ml-2 first:ml-0 rounded-full border-2 border-card bg-shade-background flex items-center justify-center" title={tool.name}>
                                                    <Icon size={15} className="text-muted-foreground" />
                                                </div>
                                            );
                                        })}
                                        </div>
                                        {c.tools.length > 8 && (
                                            <span className="ml-2 text-xs font-medium text-muted-foreground">
                                                +{c.tools.length - 8} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <ToolCollectionCard
                key={editingCollection?.id ?? "new"}
                isOpen={isCardOpen || editingCollection !== null}
                isEditing={editingCollection !== null}
                initialTitle={editingCollection?.title}
                initialDescription={editingCollection?.description}
                onClose={() => {
                    setIsCardOpen(false);
                    setEditingCollection(null);
                }}
                onSubmit={isCardOpen ? handleAddCollection : handleSaveCollection}
            />
            <ConfirmDeleteCard
                isOpen={deleteTarget !== null}
                title={deleteTarget?.title ?? ""}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};
