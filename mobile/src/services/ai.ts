import { api } from "@/lib/api";
import type { OperationResult } from "@/generated/contract-types";
export interface ToolResult { name: string; link: string; description: string; reason: string }
export interface AiMessage { id: string; role: string; content: string; results: ToolResult[] | null; error: string | null; createdAt: string }
export interface AiChatSummary { id: string; title: string; updatedAt: string; lastMessage?: string | null }
export function getChats() { return api<OperationResult<"listAIChats", { chats: AiChatSummary[] }>>("/ai-search/chats"); }
export function getChat(id: string) { return api<OperationResult<"getAIChat", { chat: { id: string; title: string; messages: AiMessage[] } }>>(`/ai-search/chats/${id}`); }
export function createChat(query?: string) { return api<OperationResult<"createAIChat", { chat: AiChatSummary }>>("/ai-search/chats", { method: "POST", body: JSON.stringify({ query }) }); }
export function deleteChat(id: string) { return api<OperationResult<"deleteAIChat", { ok: true }>>(`/ai-search/chats/${id}`, { method: "DELETE" }); }
export function askAi(query: string, chatId: string) { return api<OperationResult<"askAI", { answer: string; results: ToolResult[] }>>("/ai-search", { method: "POST", body: JSON.stringify({ query, chatId }) }); }
