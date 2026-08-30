import { api } from "@/lib/api";
export interface ToolResult { name: string; link: string; description: string; reason: string }
export interface AiMessage { id: string; role: string; content: string; results: ToolResult[] | null; error: string | null; createdAt: string }
export interface AiChatSummary { id: string; title: string; updatedAt: string; lastMessage?: string | null }
export function getChats() { return api<{ chats: AiChatSummary[] }>("/ai-search/chats"); }
export function getChat(id: string) { return api<{ chat: { id: string; title: string; messages: AiMessage[] } }>(`/ai-search/chats/${id}`); }
export function createChat(query?: string) { return api<{ chat: AiChatSummary }>("/ai-search/chats", { method: "POST", body: JSON.stringify({ query }) }); }
export function deleteChat(id: string) { return api<{ ok: true }>(`/ai-search/chats/${id}`, { method: "DELETE" }); }
export function askAi(query: string, chatId: string) { return api<{ answer: string; results: ToolResult[] }>("/ai-search", { method: "POST", body: JSON.stringify({ query, chatId }) }); }
