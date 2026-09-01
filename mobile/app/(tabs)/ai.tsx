import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Sparkles, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { isSafeExternalUrl } from "@/lib/links";
import { askAi, createChat, deleteChat, getChat, getChats } from "@/services/ai";

export default function AiScreen() {
  const client = useQueryClient();
  const [chatId, setChatId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const chats = useQuery({ queryKey: ["ai-chats"], queryFn: getChats });
  const chat = useQuery({ queryKey: ["ai-chat", chatId], queryFn: () => getChat(chatId!), enabled: Boolean(chatId) });
  const send = useMutation({ mutationFn: async (text: string) => { const id = chatId ?? (await createChat(text)).chat.id; if (!chatId) setChatId(id); return askAi(text, id); }, onSuccess: () => { setQuery(""); void client.invalidateQueries({ queryKey: ["ai-chat"] }); void client.invalidateQueries({ queryKey: ["ai-chats"] }); } });
  const remove = useMutation({ mutationFn: deleteChat, onSuccess: () => { setChatId(null); void client.invalidateQueries({ queryKey: ["ai-chats"] }); } });
  return <Screen title="ToolKit AI" subtitle="Describe the job. Find the right tools." refreshing={chats.isRefetching || chat.isRefetching} onRefresh={() => { void chats.refetch(); if (chatId) void chat.refetch(); }} action={<Pressable accessibilityLabel="New conversation" onPress={() => setChatId(null)} className="h-11 w-11 items-center justify-center rounded-2xl bg-card"><Plus color="#292d32" size={21} /></Pressable>}>
    {chats.data?.chats.length ? <View className="gap-2"><Text className="font-bold text-foreground">Conversations</Text><View className="flex-row flex-wrap gap-2">{chats.data.chats.slice(0, 6).map((item) => <Pressable key={item.id} onPress={() => setChatId(item.id)} className={`rounded-full border px-4 py-2 ${chatId === item.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}><Text numberOfLines={1} className="max-w-40 text-sm text-foreground">{item.title}</Text></Pressable>)}</View></View> : null}
    {!chatId ? <View className="items-center gap-4 rounded-[32px] border border-border bg-card px-5 py-10"><View className="h-20 w-20 items-center justify-center rounded-[28px] bg-primary/10"><Sparkles color="#ed4b4b" size={34} /></View><Text className="text-center text-xl font-bold text-foreground">What are you looking for?</Text><Text className="text-center text-sm leading-5 text-muted-foreground">Ask for a coding assistant, creative tool, or workflow recommendation.</Text></View> : null}
    {chat.isPending && chatId ? <ActivityIndicator color="#ed4b4b" /> : null}
    {chat.data?.chat.messages.map((message) => <View key={message.id} className={`gap-3 rounded-3xl p-4 ${message.role === "user" ? "ml-8 rounded-br-lg bg-foreground" : "mr-4 border border-border bg-card"}`}><Text className={message.role === "user" ? "text-card" : "text-foreground"}>{message.content || message.error}</Text>{message.results?.map((tool) => <Pressable accessibilityRole="link" accessibilityLabel={`Open ${tool.name}`} key={tool.link} disabled={!isSafeExternalUrl(tool.link)} onPress={() => void Linking.openURL(tool.link)} className="gap-1 rounded-2xl bg-input p-3"><Text className="font-bold text-foreground">{tool.name}</Text><Text className="text-sm text-muted-foreground">{tool.description}</Text><Text className="text-xs font-semibold text-primary">{tool.reason}</Text></Pressable>)}</View>)}
    {send.isError ? <Text accessibilityRole="alert" className="rounded-2xl bg-destructive/10 p-3 text-destructive">{send.error.message}</Text> : null}
    <View className="flex-row items-end gap-2 rounded-3xl border border-border bg-card p-2 pl-4"><TextInput accessibilityLabel="AI prompt" value={query} onChangeText={setQuery} multiline placeholder="Ask for a tool…" placeholderTextColor="#6f6a87" className="max-h-32 min-h-12 flex-1 py-3 text-base text-foreground" /><Pressable testID="ai-send" accessibilityRole="button" accessibilityLabel="Send AI prompt" disabled={!query.trim() || send.isPending} onPress={() => send.mutate(query.trim())} className="h-12 w-12 items-center justify-center rounded-full bg-foreground disabled:opacity-30">{send.isPending ? <ActivityIndicator color="#ed4b4b" /> : <Send color="#ed4b4b" size={20} />}</Pressable></View>
    {chatId ? <Pressable accessibilityRole="button" accessibilityLabel="Delete conversation" onPress={() => remove.mutate(chatId)} className="min-h-12 flex-row items-center justify-center gap-2"><Trash2 color="#ed4b4b" size={18} /><Text className="font-semibold text-primary">Delete conversation</Text></Pressable> : null}
  </Screen>;
}
