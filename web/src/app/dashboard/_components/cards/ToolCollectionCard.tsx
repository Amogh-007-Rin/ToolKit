'use client'

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, X } from "lucide-react";

interface ToolCollectionCardProps {
    isOpen: boolean;
    isEditing?: boolean;
    initialTitle?: string;
    initialDescription?: string;
    onClose: () => void;
    onSubmit: (title: string, description: string) => void;
}

export default function ToolCollectionCard({
    isOpen,
    isEditing = false,
    initialTitle = "",
    initialDescription = "",
    onClose,
    onSubmit,
}: ToolCollectionCardProps) {
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);

    const handleAdd = () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;
        onSubmit(trimmedTitle, description.trim());
        setTitle("");
        setDescription("");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={onClose}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.6, y: 12 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                            className="pointer-events-auto w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
                        >
                            <div className="part-1 w-full h-16 flex items-center justify-between px-6 border-b border-border">
                                <p className="text-xl text-foreground font-semibold">{isEditing ? "Edit Collection" : "New Collection"}</p>
                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ rotate: 90 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>
                            <div className="part-2 w-full flex flex-col gap-4 p-6">
                                <input
                                    type="text"
                                    placeholder="Collection Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                />
                                <textarea
                                    placeholder="Description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                                />
                            </div>
                            <div className="part-3 w-full p-6 pt-0">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAdd}
                                    disabled={!title.trim()}
                                    className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                                >
                                    {isEditing ? <Check size={18} /> : <Plus size={18} />}
                                    {isEditing ? "Save changes" : "Add collection"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
