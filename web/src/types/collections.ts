export interface Tool {
    id: number;
    name: string;
    link: string;
    icon: string;
    logoUrl: string | null;
}

export interface Collection {
    id: number;
    title: string;
    description: string;
    tools: Tool[];
}
