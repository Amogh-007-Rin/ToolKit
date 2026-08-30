import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { clientId } from "@/lib/ids";
import { getMessages, markRoomRead, MessageItem, realtimeUrl } from "@/services/messages";
import { useSessionStore } from "@/store/session";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useSessionStore((state) => state.user?.id);
  const client = useQueryClient();
  const [draft, setDraft] = useState("");
  const [optimistic, setOptimistic] = useState<MessageItem[]>([]);
  const socket = useRef<WebSocket | null>(null);
  const messages = useQuery({ queryKey: ["messages", id], queryFn: () => getMessages(id), enabled: Boolean(id) });
  useEffect(() => { if (id) void markRoomRead(id).then(() => client.invalidateQueries({ queryKey: ["rooms"] })); }, [client, id]);
  useEffect(() => {
    let active = true; let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = async () => { try { const ws = new WebSocket(await realtimeUrl()); if (!active) return ws.close(); socket.current = ws; ws.onopen = () => ws.send(JSON.stringify({ type: "joinRoom", roomId: id })); ws.onmessage = (event) => { const data = JSON.parse(String(event.data)) as { type: string; message?: MessageItem; tempId?: string; delivered?: boolean }; if (data.type === "message" && data.message) void client.invalidateQueries({ queryKey: ["messages", id] }); if (data.type === "messageAck" && data.tempId) setOptimistic((items) => items.filter((item) => item.id !== data.tempId)); }; ws.onclose = () => { if (active) retry = setTimeout(connect, 1500); }; } catch { if (active) retry = setTimeout(connect, 3000); } };
    void connect(); return () => { active = false; if (retry) clearTimeout(retry); socket.current?.close(); };
  }, [client, id]);
  const send = () => { const content = draft.trim(); if (!content || socket.current?.readyState !== WebSocket.OPEN) return; const tempId = clientId("message"); setOptimistic((items) => [...items, { id: tempId, roomId: id, senderId: userId ?? "", content, attachments: [], createdAt: new Date().toISOString(), pending: true }]); socket.current.send(JSON.stringify({ type: "sendMessage", roomId: id, tempId, content, attachments: [] })); setDraft(""); };
  return <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}><Screen title="Conversation" subtitle="Messages are synchronized in realtime.">{messages.isPending ? <ActivityIndicator color="#ed4b4b" /> : null}{[...(messages.data?.messages ?? []), ...optimistic].map((message) => <View key={message.id} className={`max-w-[85%] rounded-3xl px-4 py-3 ${message.senderId === userId ? "self-end bg-primary" : "self-start bg-card"}`}><Text className={message.senderId === userId ? "text-white" : "text-foreground"}>{message.content}</Text>{message.pending ? <Text className="mt-1 text-xs text-white/70">Sending…</Text> : null}</View>)}<View className="flex-row items-end gap-2 rounded-3xl border border-border bg-card p-2 pl-4"><TextInput value={draft} onChangeText={setDraft} multiline placeholder="Message…" className="max-h-28 min-h-12 flex-1 py-3 text-foreground" /><Pressable onPress={send} className="h-12 w-12 items-center justify-center rounded-2xl bg-primary"><Send color="white" size={19} /></Pressable></View></Screen></KeyboardAvoidingView>;
}
