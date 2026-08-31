import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { Bell, Check, CheckCheck, Heart, MessageCircle, Trash2, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { clearNotifications, deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead, NotificationItem } from "@/services/product";

type Filter = "all" | "unread" | "follow" | "like" | "comment" | "message";
const filters: Array<{ key: Filter; label: string }> = [{ key: "all", label: "All" }, { key: "unread", label: "Unread" }, { key: "follow", label: "Follows" }, { key: "like", label: "Likes" }, { key: "comment", label: "Comments" }, { key: "message", label: "Messages" }];

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const client = useQueryClient();
  const selection = filter === "unread" ? { unread: true } : filter === "all" ? undefined : { type: filter };
  const notifications = useQuery({ queryKey: ["notifications", filter], queryFn: () => getNotifications(selection) });
  const refresh = () => void client.invalidateQueries({ queryKey: ["notifications"] });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const markOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const removeOne = useMutation({ mutationFn: deleteNotification, onSuccess: refresh });

  const open = (item: NotificationItem) => {
    if (!item.read) markOne.mutate(item.id);
    if (item.postId) router.push({ pathname: "/post/[id]", params: { id: item.postId } });
    else if (item.actor.tag) router.push({ pathname: "/user/[tag]" as never, params: { tag: item.actor.tag } } as never);
  };
  const actions = (item: NotificationItem) => Alert.alert("Notification actions", undefined, [
    ...(!item.read ? [{ text: "Mark as read", onPress: () => markOne.mutate(item.id) }] : []),
    { text: "Delete", style: "destructive", onPress: () => removeOne.mutate(item.id) },
    { text: "Cancel", style: "cancel" },
  ]);
  const clear = () => Alert.alert("Clear all notifications?", "This cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Clear all", style: "destructive", onPress: () => void clearNotifications().then(refresh) }]);

  return <Screen title="Notifications" subtitle={`${notifications.data?.unreadCount ?? 0} unread`} action={<Pressable accessibilityLabel="Mark all as read" disabled={!notifications.data?.unreadCount || markAll.isPending} onPress={() => markAll.mutate()} className="h-11 w-11 items-center justify-center rounded-2xl bg-card disabled:opacity-40"><CheckCheck color="#ed4b4b" size={20} /></Pressable>}>
    <View accessibilityRole="tablist" className="flex-row flex-wrap gap-2">{filters.map((item) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: filter === item.key }} key={item.key} onPress={() => setFilter(item.key)} className={`min-h-11 justify-center rounded-full px-4 ${filter === item.key ? "bg-primary" : "bg-card"}`}><Text className={filter === item.key ? "font-semibold text-white" : "font-semibold text-foreground"}>{item.label}</Text></Pressable>)}</View>
    {notifications.data?.notifications.map((item) => {
      const Icon = item.type === "follow" ? UserPlus : item.type === "like" ? Heart : item.type === "comment" ? MessageCircle : Bell;
      const action = item.type === "follow" ? "followed you" : item.type === "like" ? "liked your post" : item.type === "comment" ? "commented on your post" : item.type === "message" ? "sent you a message" : "sent an update";
      return <Pressable accessibilityRole="button" accessibilityLabel={`${item.actor.name ?? "Someone"} ${action}`} onPress={() => open(item)} onLongPress={() => actions(item)} key={item.id} className={`flex-row gap-4 rounded-3xl border p-4 ${item.read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}><View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10"><Icon color="#ed4b4b" size={20} /></View><View className="min-w-0 flex-1"><Text className="leading-5 text-foreground"><Text className="font-bold">{item.actor.name ?? item.actor.tag ?? "Someone"}</Text> {action}</Text><Text className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</Text></View>{item.read ? null : <Check color="#ed4b4b" size={16} />}</Pressable>;
    })}
    {notifications.data?.notifications.length === 0 ? <View className="items-center gap-3 rounded-3xl bg-card p-10"><Bell color="#ed4b4b" size={28} /><Text className="font-bold text-foreground">You’re all caught up</Text></View> : null}
    {(notifications.data?.totalCount ?? 0) > 0 ? <Pressable onPress={clear} className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive/10"><Trash2 color="#ed4b4b" size={18} /><Text className="font-bold text-destructive">Clear all notifications</Text></Pressable> : null}
  </Screen>;
}
