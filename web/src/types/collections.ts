export interface Tool {
    id: string;
    name: string;
    link: string | null;
    icon: string;
    logoUrl: string | null;
    description: string | null;
    reason: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface Collection {
    id: string;
    title: string;
    description: string;
    tools: Tool[];
    createdAt?: string;
    updatedAt?: string;
}
