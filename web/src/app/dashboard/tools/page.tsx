'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Cuboid, List, Pencil, Plus, Trash2, Workflow } from "lucide-react";
import Multibutton from "../_components/buttons/Multibutton";
import Searchbar from "../_components/Searchbar";
import ToolCollectionCard from "../_components/cards/ToolCollectionCard";
import ConfirmDeleteCard from "../_components/cards/ConfirmDeleteCard";
import { useCollections } from "../_components/CollectionsProvider";
import { TOOL_ICONS } from "../_components/tool-icons";
import type { Collection } from "@/types/collections";

export default function ToolsPage() {
    const router = useRouter();
    const { collections, addCollection, updateCollection, deleteCollection } = useCollections();
    const [isCardOpen, setIsCardOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCollections = collections.filter((c) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
            c.title.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query) ||
            c.tools.some((tool) => tool.name.toLowerCase().includes(query))
        );
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

    return (
        <div className="w-full h-full">
            <div className="part-1 w-full h-[10%] flex items-center">
                <div className="left-part w-[50%] h-full flex items-center p-5">
                    <p className="text-2xl text-foreground tracking-wide">ALL TOOLS</p>
                </div>
                <div className="right-part w-[50%] h-full flex items-center justify-end px-3 gap-2">
                    <Multibutton tag="Add-tool-btn" label="List" onClick={checkLog} icon={List} />
                    <Multibutton tag="Add-tool-btn" label="Board" onClick={checkLog} icon={Cuboid}
                        className="bg-foreground" iconClassName="text-background" textClassName="text-background" />
                    <Multibutton tag="Add-tool-btn" label="Add on" onClick={checkLog} icon={Workflow}
                    />
                    <Multibutton tag="Add-new-collection" label="collection" onClick={() => setIsCardOpen(true)} icon={Plus}
                        className="bg-primary" iconClassName="text-primary-foreground" textClassName="text-primary-foreground" />
                </div>
            </div>
            <div className="part-2 w-full h-[10%] flex items-center justify-center">
                <Searchbar value={searchQuery} onChange={setSearchQuery} />
            </div>
            <div className="part-3 w-full h-[80%] p-4 overflow-y-auto">
                {collections.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-lg">No collections yet. Click &quot;Add tools&quot; to create one.</p>
                    </div>
                ) : filteredCollections.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-lg">No collections match &quot;{searchQuery.trim()}&quot;.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredCollections.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => router.push(`/dashboard/tools/${c.id}`)}
                                className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-lg text-foreground font-semibold">{c.title}</p>
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
                                <p className="text-sm text-muted-foreground">{c.description || "No description"}</p>
                                {c.tools.length > 0 && (
                                    <div className="mt-2 pt-3 border-t border-border flex items-center gap-2">
                                        {c.tools.map((tool) => {
                                            const Icon = TOOL_ICONS[tool.icon] ?? TOOL_ICONS.sparkles;
                                            return tool.logoUrl ? (
                                                <Image key={tool.id} src={tool.logoUrl} width={20} height={20} alt={tool.name} />
                                            ) : (
                                                <Icon key={tool.id} size={20} className="text-muted-foreground" />
                                            );
                                        })}
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

function checkLog() {
    alert("button clicked")
};
