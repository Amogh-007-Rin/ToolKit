'use client'

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { Collection, Tool } from "@/types/collections";

const STORAGE_KEY = "toolkit-collections";

interface CollectionsContextValue {
    collections: Collection[];
    addCollection: (title: string, description: string) => void;
    updateCollection: (id: number, title: string, description: string) => void;
    deleteCollection: (id: number) => void;
    addTool: (collectionId: number, tool: Omit<Tool, "id">) => void;
    deleteTool: (collectionId: number, toolId: number) => void;
}

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

const EMPTY_COLLECTIONS: Collection[] = [];

let cachedCollections: Collection[] | null = null;
let listeners: (() => void)[] = [];

function emitChange() {
    for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
    listeners = [...listeners, listener];
    return () => {
        listeners = listeners.filter((l) => l !== listener);
    };
}

function getSnapshot(): Collection[] {
    if (cachedCollections === null) {
        cachedCollections = loadCollections();
    }
    return cachedCollections;
}

function getServerSnapshot(): Collection[] {
    return EMPTY_COLLECTIONS;
}

function loadCollections(): Collection[] {
    if (typeof window === "undefined") return EMPTY_COLLECTIONS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Collection[]) : EMPTY_COLLECTIONS;
    } catch {
        return EMPTY_COLLECTIONS;
    }
}

function saveCollections(collections: Collection[]) {
    cachedCollections = collections;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    } catch {
        // ignore storage failures
    }
    emitChange();
}

export function CollectionsProvider({ children }: { children: ReactNode }) {
    const collections = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    useEffect(() => {
        const onStorage = () => {
            cachedCollections = null;
            emitChange();
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const addCollection = (title: string, description: string) => {
        saveCollections([...getSnapshot(), { id: Date.now(), title, description, tools: [] }]);
    };

    const updateCollection = (id: number, title: string, description: string) => {
        saveCollections(
            getSnapshot().map((c) => (c.id === id ? { ...c, title, description } : c))
        );
    };

    const deleteCollection = (id: number) => {
        saveCollections(getSnapshot().filter((c) => c.id !== id));
    };

    const addTool = (collectionId: number, tool: Omit<Tool, "id">) => {
        saveCollections(
            getSnapshot().map((c) =>
                c.id === collectionId
                    ? { ...c, tools: [...c.tools, { id: Date.now(), ...tool }] }
                    : c
            )
        );
    };

    const deleteTool = (collectionId: number, toolId: number) => {
        saveCollections(
            getSnapshot().map((c) =>
                c.id === collectionId
                    ? { ...c, tools: c.tools.filter((t) => t.id !== toolId) }
                    : c
            )
        );
    };

    return (
        <CollectionsContext.Provider
            value={{ collections, addCollection, updateCollection, deleteCollection, addTool, deleteTool }}
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
