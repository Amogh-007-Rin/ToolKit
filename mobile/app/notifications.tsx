import { Bell, CheckCheck, Heart, MessageCircle, UserPlus } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { getNotifications, markAllNotificationsRead } from "@/services/product";

export default function NotificationsScreen() {
  const client = useQueryClient();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
  const markRead = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: () => void client.invalidateQueries({ queryKey: ["notifications"] }) });
  return (
    <Screen title="Notifications" subtitle={`${notifications.data?.unreadCount ?? 0} unread`} action={<Pressable disabled={!notifications.data?.unreadCount || markRead.isPending} onPress={() => markRead.mutate()} className="h-11 w-11 items-center justify-center rounded-2xl bg-card disabled:opacity-40"><CheckCheck color="#ed4b4b" size={20} /></Pressable>}>
      {notifications.isPending ? <ActivityIndicator color="#ed4b4b" /> : null}
      {notifications.data?.notifications.map((item) => {
        const Icon = item.type === "follow" ? UserPlus : item.type === "like" ? Heart : item.type === "comment" ? MessageCircle : Bell;
        const action = item.type === "follow" ? "followed you" : item.type === "like" ? "liked your post" : item.type === "comment" ? "commented on your post" : "sent an update";
        return <View key={item.id} className={`flex-row gap-4 rounded-3xl border p-4 ${item.read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}><View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10"><Icon color="#ed4b4b" size={20} /></View><View className="min-w-0 flex-1"><Text className="leading-5 text-foreground"><Text className="font-bold">{item.actor.name ?? item.actor.tag ?? "Someone"}</Text> {action}</Text><Text className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</Text></View></View>;
      })}
      {notifications.data?.notifications.length === 0 ? <View className="items-center gap-3 rounded-3xl bg-card p-10"><Bell color="#ed4b4b" size={28} /><Text className="font-bold text-foreground">You’re all caught up</Text></View> : null}
    </Screen>
  );
}
