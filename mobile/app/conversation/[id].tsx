import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams } from "expo-router";
import { ImagePlus, Paperclip, Send, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MediaViewer } from "@/components/MediaViewer";
import { Screen } from "@/components/Screen";
import { discardMutation, enqueueMutation, failMutation, queuedMutations, setMutationPayload } from "@/lib/offlineQueue";
import { retryDelay } from "@/lib/retry";
import { launchMediaLibrary } from "@/lib/mediaPicker";
import { LocalMedia, uploadMedia } from "@/services/media";
import { attachmentUrl, getMessages, getRooms, markRoomRead, MessageAttachment, MessageItem, realtimeUrl } from "@/services/messages";
import { useSessionStore } from "@/store/session";

interface PendingMessageBody { type: "sendMessage"; roomId: string; tempId: string; content: string; attachments: MessageAttachment[] }

export function ConversationContent({ roomId }: { roomId?: string }) {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = roomId ?? params.id ?? "";
  const userId = useSessionStore((state) => state.user?.id);
  const client = useQueryClient();
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<LocalMedia[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [optimistic, setOptimistic] = useState<MessageItem[]>([]);
  const [olderMessages, setOlderMessages] = useState<MessageItem[]>([]);
  const [historyComplete, setHistoryComplete] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const socket = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadController = useRef<AbortController | null>(null);
  const messages = useQuery({ queryKey: ["messages", id], queryFn: () => getMessages(id), enabled: Boolean(id) });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const room = rooms.data?.rooms.find((item) => item.id === id);
  const otherId = room?.members.find((member) => member !== userId);
  const lastSeen = otherId ? room?.memberLastSeen?.[otherId] : undefined;
  const presence = typingUsers.size ? "Typing…" : otherId && lastSeen === null ? "Online" : lastSeen ? `Last seen ${new Date(lastSeen).toLocaleString()}` : "Messages are synchronized in realtime.";

  useEffect(() => { if (id) void markRoomRead(id).then(() => client.invalidateQueries({ queryKey: ["rooms"] })); }, [client, id]);
  useEffect(() => {
    let active = true; let reconnectTimer: ReturnType<typeof setTimeout> | undefined; let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    const restorePending = async () => {
      const queued = (await queuedMutations()).filter((item) => item.operation === "message.send" && item.path === id);
      const parsed = queued.flatMap((item) => { try { return [{ item, body: JSON.parse(item.body ?? "") as PendingMessageBody }]; } catch { return []; } });
      const restored = await Promise.all(parsed.map(async ({ item, body }) => ({ id: item.id, roomId: id, senderId: userId ?? "", content: body.content, attachments: await Promise.all(body.attachments.map(async (attachment) => ({ ...attachment, url: await attachmentUrl(attachment.key).catch(() => undefined) }))), createdAt: new Date(item.createdAt).toISOString(), pending: item.status !== "failed", failed: item.status === "failed" })));
      setOptimistic(restored); return queued;
    };
    const scheduleReconnect = () => { if (!active || reconnectTimer) return; reconnectTimer = setTimeout(() => { reconnectTimer = undefined; void connect(); }, retryDelay(reconnectAttempt.current++)); };
    const connect = async () => { try { const ws = new WebSocket(await realtimeUrl()); if (!active) return ws.close(); socket.current = ws; ws.onopen = () => { reconnectAttempt.current = 0; ws.send(JSON.stringify({ type: "joinRoom", roomId: id })); heartbeatTimer = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "heartbeat" })); }, 15_000); void restorePending().then((queued) => queued.forEach((item) => { if (item.body && ws.readyState === WebSocket.OPEN) ws.send(item.body); })); void client.invalidateQueries({ queryKey: ["messages", id] }); void markRoomRead(id); }; ws.onmessage = (event) => { const data = JSON.parse(String(event.data)) as { type: string; message?: MessageItem; tempId?: string; delivered?: boolean; error?: string; userId?: string }; if (data.type === "message" && data.message) { void client.invalidateQueries({ queryKey: ["messages", id] }); void markRoomRead(id); } if ((data.type === "typingStart" || data.type === "typingStop") && data.userId) setTypingUsers((current) => { const next = new Set(current); if (data.type === "typingStart") next.add(data.userId!); else next.delete(data.userId!); return next; }); if (data.type === "messageAck" && data.tempId) { if (data.delivered) { void discardMutation(data.tempId); setOptimistic((items) => items.filter((item) => item.id !== data.tempId)); void client.invalidateQueries({ queryKey: ["messages", id] }); } else { void failMutation(data.tempId, data.error ?? "Message delivery failed"); setOptimistic((items) => items.map((item) => item.id === data.tempId ? { ...item, pending: false, failed: true } : item)); } } }; ws.onclose = () => { if (heartbeatTimer) clearInterval(heartbeatTimer); if (socket.current === ws) socket.current = null; setTypingUsers(new Set()); scheduleReconnect(); }; ws.onerror = () => ws.close(); } catch { scheduleReconnect(); } };
    void restorePending(); void connect();
    return () => { active = false; if (reconnectTimer) clearTimeout(reconnectTimer); if (heartbeatTimer) clearInterval(heartbeatTimer); if (typingTimer.current) clearTimeout(typingTimer.current); socket.current?.close(); };
  }, [client, id, userId]);

  const updateDraft = (value: string) => { setDraft(value); if (socket.current?.readyState === WebSocket.OPEN) { socket.current.send(JSON.stringify({ type: "typingStart", roomId: id })); if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => socket.current?.send(JSON.stringify({ type: "typingStop", roomId: id })), 1_200); } };
  const pickLibrary = async () => { const result = await launchMediaLibrary({ mediaTypes: ["images", "videos"], allowsMultipleSelection: true, selectionLimit: 10 - selected.length, quality: 0.8 }); if (result && !result.canceled) setSelected((current) => [...current, ...result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"), size: asset.fileSize ?? 1, name: asset.fileName ?? undefined }))].slice(0, 10)); };
  const pickFiles = async () => { const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "video/*"], multiple: true, copyToCacheDirectory: true }); if (!result.canceled) setSelected((current) => [...current, ...result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType ?? "application/octet-stream", size: asset.size ?? 1, name: asset.name }))].slice(0, 10)); };
  const chooseAttachment = () => Alert.alert("Attach media", "ToolKit accesses only media you select.", [{ text: "Photo library", onPress: () => void pickLibrary() }, { text: "Files", onPress: () => void pickFiles() }, { text: "Cancel", style: "cancel" }]);
  const send = async () => {
    const content = draft.trim(); if ((!content && !selected.length) || uploadProgress !== null) return;
    uploadController.current = new AbortController(); const localFiles = [...selected]; const attachments: MessageAttachment[] = [];
    try { if (localFiles.length) setUploadProgress(0); for (let index = 0; index < localFiles.length; index += 1) { const upload = await uploadMedia(localFiles[index], "chat", (value) => setUploadProgress((index + value) / localFiles.length), id, uploadController.current.signal); attachments.push({ key: upload.key, kind: upload.kind, name: localFiles[index].name }); } const queueId = await enqueueMutation({ operation: "message.send", path: id, method: "WS", body: null }); const payload: PendingMessageBody = { type: "sendMessage", roomId: id, tempId: queueId, content, attachments }; await setMutationPayload(queueId, JSON.stringify(payload)); setOptimistic((items) => [...items, { id: queueId, roomId: id, senderId: userId ?? "", content, attachments: attachments.map((attachment, index) => ({ ...attachment, url: localFiles[index]?.uri })), createdAt: new Date().toISOString(), pending: true }]); if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(payload)); setDraft(""); setSelected([]); setUploadProgress(null); } catch (cause) { setUploadProgress(null); Alert.alert("Attachment failed", cause instanceof Error ? cause.message : "Could not upload attachment"); }
  };
  const loadEarlier = async () => {
    const current = [...olderMessages, ...(messages.data?.messages ?? [])]; const before = current[0]?.createdAt;
    if (!before || loadingHistory || historyComplete) return;
    setLoadingHistory(true);
    try { const page = await getMessages(id, before); setOlderMessages((existing) => { const known = new Set([...existing, ...(messages.data?.messages ?? [])].map((message) => message.id)); return [...page.messages.filter((message) => !known.has(message.id)), ...existing]; }); if (page.messages.length < 50) setHistoryComplete(true); }
    catch { Alert.alert("Could not load earlier messages", "Check your connection and try again."); }
    finally { setLoadingHistory(false); }
  };
  const allMessages = [...olderMessages, ...(messages.data?.messages ?? []), ...optimistic].filter((message, index, all) => all.findIndex((candidate) => candidate.id === message.id) === index);
  return <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}><Screen title={room?.name ?? "Conversation"} subtitle={presence}>{allMessages.map((message) => <View key={message.id} className={`max-w-[88%] gap-2 rounded-3xl px-3 py-3 ${message.senderId === userId ? "self-end bg-primary" : "self-start bg-card"}`}>{message.attachments.some((attachment) => attachment.url) ? <MediaViewer media={message.attachments.flatMap((attachment, index) => attachment.url ? [{ id: `${message.id}-${index}`, type: attachment.kind, url: attachment.url }] : [])} height={190} /> : null}{message.content ? <Text className={message.senderId === userId ? "px-1 text-white" : "px-1 text-foreground"}>{message.content}</Text> : null}{message.pending ? <Text className="px-1 text-xs text-white/70">Sending…</Text> : null}{message.failed ? <Text className="px-1 text-xs text-white/70">Open Offline activity to retry</Text> : null}</View>)}
    {selected.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">{selected.map((file, index) => <View key={`${file.uri}-${index}`} className="h-24 w-24 overflow-hidden rounded-2xl bg-card">{file.mimeType.startsWith("image/") ? <Image source={{ uri: file.uri }} className="h-full w-full" /> : <View className="flex-1 items-center justify-center"><Paperclip color="#ed4b4b" size={24} /></View>}<Pressable accessibilityLabel="Remove attachment" onPress={() => setSelected((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 h-8 w-8 items-center justify-center rounded-full bg-black/60"><X color="white" size={15} /></Pressable></View>)}</ScrollView> : null}
    {uploadProgress !== null ? <View className="gap-2"><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(uploadProgress * 100) }} className="h-2 overflow-hidden rounded-full bg-border"><View style={{ width: `${uploadProgress * 100}%` }} className="h-full bg-primary" /></View><Pressable accessibilityRole="button" accessibilityLabel="Cancel attachment upload" onPress={() => uploadController.current?.abort()}><Text className="text-center text-destructive">Cancel attachment upload</Text></Pressable></View> : null}
    <View className="flex-row items-end gap-2 rounded-3xl border border-border bg-card p-2"><Pressable accessibilityRole="button" accessibilityLabel="Attach media" onPress={chooseAttachment} className="h-12 w-12 items-center justify-center rounded-2xl bg-input"><ImagePlus color="#ed4b4b" size={20} /></Pressable><TextInput accessibilityLabel="Message" value={draft} onChangeText={updateDraft} multiline placeholder="Message…" className="max-h-28 min-h-12 flex-1 py-3 text-foreground" /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={(!draft.trim() && !selected.length) || uploadProgress !== null} onPress={() => void send()} className="h-12 w-12 items-center justify-center rounded-2xl bg-primary disabled:opacity-40"><Send color="white" size={19} /></Pressable></View>
    {(messages.data?.messages.length ?? 0) >= 50 || olderMessages.length ? <Pressable disabled={loadingHistory || historyComplete} onPress={() => void loadEarlier()} className="min-h-11 items-center justify-center rounded-2xl bg-card disabled:opacity-50"><Text className="font-semibold text-primary">{historyComplete ? "Beginning of conversation" : loadingHistory ? "Loading…" : "Load earlier messages"}</Text></Pressable> : null}
  </Screen></KeyboardAvoidingView>;
}

export default function ConversationScreen() {
  return <ConversationContent />;
}
