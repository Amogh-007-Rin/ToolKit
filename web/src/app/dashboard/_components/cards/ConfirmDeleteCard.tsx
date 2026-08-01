'use client'

import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDeleteCardProps {
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDeleteCard({ isOpen, title, onConfirm, onCancel }: ConfirmDeleteCardProps) {
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
                        onClick={onCancel}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.6, y: 12 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                            className="pointer-events-auto w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl p-6 flex flex-col gap-6"
                        >
                            <p className="text-lg text-foreground font-semibold text-center">
                                Are you sure you want to delete your {title}?
                            </p>
                            <div className="flex gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onCancel}
                                    className="flex-1 h-11 bg-muted text-foreground rounded-xl font-medium text-sm hover:bg-muted-foreground/20 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onConfirm}
                                    className="flex-1 h-11 bg-destructive text-destructive-foreground rounded-xl font-medium text-sm hover:bg-destructive/90 transition-colors cursor-pointer"
                                >
                                    Delete
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
