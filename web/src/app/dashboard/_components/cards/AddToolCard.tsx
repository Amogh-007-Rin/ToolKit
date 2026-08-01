'use client'

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Plus, X } from "lucide-react";
import Image from "next/image";
import { TOOL_ICONS, TOOL_ICON_NAMES } from "../tool-icons";
import { getLogoUrl } from "@/utils/logo";
import type { Tool } from "@/types/collections";

interface AddToolCardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (tool: Omit<Tool, "id">) => void;
}

export default function AddToolCard({ isOpen, onClose, onSubmit }: AddToolCardProps) {
    const [name, setName] = useState("");
    const [link, setLink] = useState("");
    const [selectedIcon, setSelectedIcon] = useState<string>(TOOL_ICON_NAMES[0]);

    const logoUrl = getLogoUrl(link);

    const handleAdd = () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;
        onSubmit({
            name: trimmedName,
            link: link.trim(),
            icon: selectedIcon,
            logoUrl: logoUrl ?? null,
        });
        setName("");
        setLink("");
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
                                <p className="text-xl text-foreground font-semibold">Add Tool</p>
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
                                    placeholder="Tool Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                />
                                <div className="relative">
                                    <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Tool Link (https://example.com)"
                                        value={link}
                                        onChange={(e) => setLink(e.target.value)}
                                        className="w-full h-12 bg-input border border-border rounded-xl pl-10 pr-12 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                    />
                                    {logoUrl && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden">
                                            <Image src={logoUrl} width={16} height={16} alt="logo preview" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-muted-foreground">
                                        Choose a logo {logoUrl ? "(fallback — logo will be taken from the link)" : ""}
                                    </p>
                                    <div className="grid grid-cols-8 gap-2">
                                        {TOOL_ICON_NAMES.map((iconName) => {
                                            const Icon = TOOL_ICONS[iconName];
                                            const isSelected = selectedIcon === iconName;
                                            return (
                                                <button
                                                    key={iconName}
                                                    onClick={() => setSelectedIcon(iconName)}
                                                    className={`aspect-square rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                                                        isSelected
                                                            ? "border-primary bg-primary/10 text-primary"
                                                            : "border-border bg-input text-muted-foreground hover:text-foreground"
                                                    }`}
                                                >
                                                    <Icon size={20} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="part-3 w-full p-6 pt-0">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAdd}
                                    disabled={!name.trim()}
                                    className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} />
                                    Add tool
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
