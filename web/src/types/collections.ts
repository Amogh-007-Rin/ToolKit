export interface Tool {
    id: string;
    name: string;
    link: string | null;
    icon: string;
    logoUrl: string | null;
}

export interface Collection {
    id: string;
    title: string;
    description: string;
    tools: Tool[];
}
