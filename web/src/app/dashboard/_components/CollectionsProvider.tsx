'use client'

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Collection, Tool } from "@/types/collections";

interface CollectionsContextValue {
    collections: Collection[];
    loading: boolean;
    addCollection: (title: string, description: string) => Promise<void>;
    updateCollection: (id: string, title: string, description: string) => Promise<void>;
    deleteCollection: (id: string) => Promise<void>;
    addTool: (collectionId: string, tool: Omit<Tool, "id">) => Promise<void>;
    deleteTool: (collectionId: string, toolId: string) => Promise<void>;
}

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

const JSON_HEADERS = { "Content-Type": "application/json" };

export function CollectionsProvider({ children }: { children: ReactNode }) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/collections")
            .then(async (res) => {
                if (!res.ok) throw new Error(`GET /api/collections failed: ${res.status}`);
                const data = await res.json();
                if (!cancelled) setCollections(data.collections);
            })
            .catch((error) => console.error(error))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const addCollection = async (title: string, description: string) => {
        try {
            const res = await fetch("/api/collections", {
                method: "POST",
                headers: JSON_HEADERS,
                body: JSON.stringify({ title, description }),
            });
            if (!res.ok) throw new Error(`POST /api/collections failed: ${res.status}`);
            const data = await res.json();
            setCollections((prev) => [data.collection, ...prev]);
        } catch (error) {
            console.error(error);
        }
    };

    const updateCollection = async (id: string, title: string, description: string) => {
        try {
            const res = await fetch(`/api/collections/${id}`, {
                method: "PATCH",
                headers: JSON_HEADERS,
                body: JSON.stringify({ title, description }),
            });
            if (!res.ok) throw new Error(`PATCH /api/collections/${id} failed: ${res.status}`);
            const data = await res.json();
            setCollections((prev) =>
                prev.map((c) => (c.id === id ? data.collection : c))
            );
        } catch (error) {
            console.error(error);
        }
    };

    const deleteCollection = async (id: string) => {
        try {
            const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error(`DELETE /api/collections/${id} failed: ${res.status}`);
            setCollections((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const addTool = async (collectionId: string, tool: Omit<Tool, "id">) => {
        try {
            const res = await fetch(`/api/collections/${collectionId}/tools`, {
                method: "POST",
                headers: JSON_HEADERS,
                body: JSON.stringify(tool),
            });
            if (!res.ok) throw new Error(`POST /api/collections/${collectionId}/tools failed: ${res.status}`);
            const data = await res.json();
            setCollections((prev) =>
                prev.map((c) =>
                    c.id === collectionId ? { ...c, tools: [...c.tools, data.tool] } : c
                )
            );
        } catch (error) {
            console.error(error);
        }
    };

    const deleteTool = async (collectionId: string, toolId: string) => {
        try {
            const res = await fetch(`/api/collections/${collectionId}/tools/${toolId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error(`DELETE /api/collections/${collectionId}/tools/${toolId} failed: ${res.status}`);
            setCollections((prev) =>
                prev.map((c) =>
                    c.id === collectionId ? { ...c, tools: c.tools.filter((t) => t.id !== toolId) } : c
                )
            );
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <CollectionsContext.Provider
            value={{
                collections,
                loading,
                addCollection,
                updateCollection,
                deleteCollection,
                addTool,
                deleteTool,
            }}
        >
            {children}
        </CollectionsContext.Provider>
    );
}

export function useCollections(): CollectionsContextValue {
    const ctx = useContext(CollectionsContext);
    if (!ctx) throw new Error("useCollections must be used within CollectionsProvider");
    return ctx;
}
