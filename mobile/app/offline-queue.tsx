import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { RefreshCcw, Trash2, WifiOff } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { api } from "@/lib/api";
import { discardMutation, failMutation, QueuedMutation, queuedMutations, retryMutation } from "@/lib/offlineQueue";
import { executeQueuedMediaMutation, removePersistedMedia } from "@/services/media";

export default function OfflineQueueScreen() {
  const [items, setItems] = useState<QueuedMutation[]>([]);
  const load = useCallback(() => queuedMutations().then(setItems), []);
  useEffect(() => { void load(); }, [load]);

  const retry = async (item: QueuedMutation) => {
    await retryMutation(item.id);
    if (item.operation === "message.send") {
      Alert.alert("Message ready to retry", "Open the conversation and ToolKit will resend it with the same message ID.");
      return load();
    }
    try {
      if (item.operation === "media.post.create") await executeQueuedMediaMutation(item);
      else await api(item.path, { method: item.method, body: item.body, headers: { "Idempotency-Key": item.id } });
      await discardMutation(item.id);
    } catch (cause) {
      await failMutation(item.id, cause instanceof Error ? cause.message : "Retry failed");
    }
    await load();
  };

  const discard = (item: QueuedMutation) => Alert.alert("Discard queued change?", "This local change will not be sent to ToolKit.", [
    { text: "Cancel", style: "cancel" },
    { text: "Discard", style: "destructive", onPress: () => void (async () => { if (item.operation === "media.post.create" && item.body) { try { await removePersistedMedia((JSON.parse(item.body) as { files: Parameters<typeof removePersistedMedia>[0] }).files); } catch {} } await discardMutation(item.id); await load(); })() },
  ]);

  return (
    <Screen title="Offline activity" subtitle="Review changes waiting to synchronize. Failed work remains here until retried or discarded.">
      {items.map((item) => (
        <View key={item.id} className="gap-3 rounded-3xl border border-border bg-card p-5">
          <View className="flex-row items-start gap-3"><WifiOff color="#ed4b4b" size={20} /><View className="flex-1"><Text className="font-bold text-foreground">{item.operation}</Text><Text className="mt-1 text-xs text-muted-foreground">{item.status} · {item.attempts} attempts</Text></View></View>
          {item.error ? <Text accessibilityRole="alert" className="text-sm text-destructive">{item.error}</Text> : null}
          <View className="flex-row gap-2">
            <Pressable accessibilityRole="button" accessibilityLabel={`Retry ${item.operation}`} onPress={() => void retry(item)} className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"><RefreshCcw color="white" size={17} /><Text className="font-bold text-white">Retry</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Discard ${item.operation}`} onPress={() => discard(item)} className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive/10"><Trash2 color="#ed4b4b" size={17} /><Text className="font-bold text-destructive">Discard</Text></Pressable>
          </View>
        </View>
      ))}
      {items.length === 0 ? <View className="items-center gap-3 rounded-3xl border border-border bg-card p-10"><RefreshCcw color="#6f6a87" size={30} /><Text className="font-bold text-foreground">Everything is synchronized</Text><Text className="text-center text-muted-foreground">Offline changes and failed retries will appear here.</Text></View> : null}
    </Screen>
  );
}
