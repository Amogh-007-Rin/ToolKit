import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { MessageCircle, Search } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { getRooms } from "@/services/messages";

export default function MessagesScreen() {
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: getRooms, refetchInterval: 30_000 });
  return <Screen title="Messages" subtitle="Realtime conversations with ToolKit creators.">
    <View className="flex-row items-center gap-3 rounded-2xl bg-input px-4 py-3.5"><Search color="#6f6a87" size={19} /><Text className="text-sm text-muted-foreground">Search conversations…</Text></View>
    {rooms.isPending ? <ActivityIndicator color="#ed4b4b" /> : null}
    {rooms.isError ? <Text accessibilityRole="alert" className="rounded-2xl bg-destructive/10 p-4 text-destructive">Could not load conversations.</Text> : null}
    {rooms.data?.rooms.length === 0 ? <View className="items-center gap-3 rounded-3xl border border-border bg-card p-8"><MessageCircle color="#ed4b4b" size={34} /><Text className="font-bold text-foreground">No conversations yet</Text><Text className="text-center text-muted-foreground">Start one from a creator profile.</Text></View> : null}
    {rooms.data?.rooms.map((room) => <Pressable key={room.id} onPress={() => router.push({ pathname: "/conversation/[id]", params: { id: room.id } })} className="flex-row items-center gap-4 rounded-3xl border border-border bg-card p-4"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><MessageCircle color="#ed4b4b" size={21} /></View><View className="min-w-0 flex-1"><Text numberOfLines={1} className="font-bold text-foreground">{room.name ?? "Direct conversation"}</Text><Text numberOfLines={1} className="text-sm text-muted-foreground">{room.lastMessage?.content ?? "No messages yet"}</Text></View>{room.unreadCount > 0 ? <View className="min-w-6 items-center rounded-full bg-primary px-2 py-1"><Text className="text-xs font-bold text-white">{room.unreadCount}</Text></View> : null}</Pressable>)}
  </Screen>;
}
