import { Compass, Search, UserPlus } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Image, Text, TextInput, View } from "react-native";
import { useDeferredValue, useState } from "react";
import { Screen } from "@/components/Screen";
import { searchCreators } from "@/services/product";

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const creators = useQuery({ queryKey: ["creators", deferredQuery], queryFn: () => searchCreators(deferredQuery) });
  return (
    <Screen title="Explore creators" subtitle="Find people with a toolkit worth following.">
      <View className="flex-row items-center gap-3 rounded-2xl bg-input px-4"><Search color="#6f6a87" size={19} /><TextInput value={query} onChangeText={setQuery} placeholder="Search creators…" placeholderTextColor="#6f6a87" className="h-14 flex-1 text-foreground" /></View>
      {creators.isPending ? <ActivityIndicator color="#ed4b4b" /> : null}
      {creators.data?.users.map((creator) => <View key={creator.id} className="flex-row items-center gap-4 rounded-3xl border border-border bg-card p-4">{creator.image ? <Image source={{ uri: creator.image }} className="h-14 w-14 rounded-2xl" /> : <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><Compass color="#ed4b4b" size={22} /></View>}<View className="min-w-0 flex-1"><Text numberOfLines={1} className="font-bold text-foreground">{creator.name ?? creator.tag ?? "Creator"}</Text><Text numberOfLines={1} className="text-sm text-muted-foreground">{creator.role ?? (creator.tag ? `@${creator.tag}` : "ToolKit creator")}</Text><Text className="mt-1 text-xs text-muted-foreground">{creator.followers} followers</Text></View><View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary"><UserPlus color="white" size={18} /></View></View>)}
    </Screen>
  );
}
