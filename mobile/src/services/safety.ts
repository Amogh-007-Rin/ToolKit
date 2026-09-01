import { api } from "@/lib/api";
import type { OperationResult } from "@/generated/contract-types";

export function blockUser(userId: string) { return api<OperationResult<"blockUser">>("/blocks", { method: "POST", body: JSON.stringify({ userId }) }); }
export function unblockUser(userId: string) { return api<OperationResult<"unblockUser">>(`/blocks?userId=${encodeURIComponent(userId)}`, { method: "DELETE" }); }
export function reportContent(targetType: "profile" | "post" | "comment" | "message", targetId: string, reason: string, description?: string, messageEvidence?: object) { return api<OperationResult<"reportContent", { report: { id: string } }>>("/reports", { method: "POST", body: JSON.stringify({ targetType, targetId, reason, description, messageEvidence }) }); }
