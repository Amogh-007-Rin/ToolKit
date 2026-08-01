'use client'

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useCollections } from "../../_components/CollectionsProvider";
import { TOOL_ICONS } from "../../_components/tool-icons";
import AddToolCard from "../../_components/cards/AddToolCard";
import ConfirmDeleteCard from "../../_components/cards/ConfirmDeleteCard";
import Image from "next/image";
import type { Tool } from "@/types/collections";

export default function CollectionDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { collections, loading, addTool, deleteTool } = useCollections();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Tool | null>(null);

    const collection = collections.find((c) => c.id === params.id);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Loading…</p>
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

    const handleConfirmDelete = () => {
        if (deleteTarget) {
            deleteTool(collection.id, deleteTarget.id);
        }
        setDeleteTarget(null);
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="part-1 w-full h-[10%] flex items-center justify-between px-5">
                <div className="flex flex-col gap-1">
                    <p className="text-2xl text-foreground tracking-wide">{collection.title}</p>
                    {collection.description && (
                        <p className="text-sm text-muted-foreground">{collection.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsAddOpen(true)}
                        className="h-11 px-5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add tools
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
            <div className="part-2 w-full h-[10%] flex items-center justify-center">
                <div className="w-full px-5 flex items-center gap-3">
                    <p className="text-lg text-foreground font-semibold">Tools</p>
                    <span className="text-sm text-muted-foreground">
                        {collection.tools.length} {collection.tools.length === 1 ? "tool" : "tools"}
                    </span>
                </div>
            </div>
            <div className="part-3 w-full h-[80%] p-4 overflow-y-auto">
                {collection.tools.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-lg">
                            No tools yet. Click &quot;Add tools&quot; to add your first tool.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {collection.tools.map((tool) => {
                            const Icon = TOOL_ICONS[tool.icon] ?? TOOL_ICONS.sparkles;
                            return (
                                <div
                                    key={tool.id}
                                    onClick={() => {
                                        if (tool.link) window.open(tool.link, "_blank", "noopener,noreferrer");
                                    }}
                                    className={`bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-2 ${
                                        tool.link ? "cursor-pointer hover:border-primary/50 transition-colors" : ""
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative w-10 h-10 rounded-xl bg-input flex items-center justify-center overflow-hidden shrink-0">
                                            {tool.logoUrl ? (
                                                <Image
                                                    src={tool.logoUrl}
                                                    fill
                                                    sizes="40px"
                                                    alt={tool.name}
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <Icon size={20} className="text-primary" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <p className="text-lg text-foreground font-medium truncate">{tool.name}</p>
                                            {tool.link && (
                                                <p className="text-xs text-muted-foreground truncate">{tool.link}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteTarget(tool);
                                        }}
                                        className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <AddToolCard
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSubmit={handleAddTool}
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
