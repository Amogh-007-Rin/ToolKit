import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { FolderPlus, LayoutGrid, Plus, Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { FeatureCard } from "@/components/FeatureCard";
import { Screen } from "@/components/Screen";
import { createCollection, getCollections } from "@/services/product";

export default function ToolsScreen() {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const client = useQueryClient();
  const collections = useQuery({ queryKey: ["collections"], queryFn: getCollections });
  const create = useMutation({ mutationFn: () => createCollection(title.trim()), onSuccess: () => { setTitle(""); setCreating(false); void client.invalidateQueries({ queryKey: ["collections"] }); } });
  return <Screen title="Tools" subtitle="Organize the software that powers your workflow." action={<Pressable accessibilityLabel="New collection" onPress={() => setCreating((value) => !value)} className="h-11 w-11 items-center justify-center rounded-2xl bg-primary"><Plus color="white" size={22} /></Pressable>}>
    <View className="flex-row items-center gap-3 rounded-2xl bg-input px-4 py-3.5"><Search color="#6f6a87" size={19} /><Text className="text-sm text-muted-foreground">Search your tools…</Text></View>
    {creating ? <View className="gap-3 rounded-3xl border border-border bg-card p-4"><Text className="font-bold text-foreground">New collection</Text><TextInput value={title} onChangeText={setTitle} placeholder="Collection title" className="h-12 rounded-2xl bg-input px-4 text-foreground" /><Pressable disabled={!title.trim() || create.isPending} onPress={() => create.mutate()} className="h-12 items-center justify-center rounded-2xl bg-primary disabled:opacity-50">{create.isPending ? <ActivityIndicator color="white" /> : <Text className="font-bold text-white">Create</Text>}</Pressable></View> : null}
    {collections.isPending ? <ActivityIndicator color="#ed4b4b" /> : null}
    {collections.isError ? <Text accessibilityRole="alert" className="rounded-2xl bg-destructive/10 p-4 text-destructive">Could not load collections.</Text> : null}
    {collections.data?.collections.length === 0 ? <FeatureCard icon={FolderPlus} title="Create your first collection" detail="Group related tools, add descriptions, and showcase your favorites." /> : null}
    {collections.data?.collections.map((collection) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/collection/[id]", params: { id: collection.id } })} key={collection.id} className="gap-3 rounded-3xl border border-border bg-card p-5"><View className="flex-row items-center gap-3"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10"><LayoutGrid color="#ed4b4b" size={20} /></View><View className="min-w-0 flex-1"><Text className="text-base font-bold text-foreground">{collection.title}</Text><Text className="text-xs text-muted-foreground">{collection.tools.length} tools{collection.showcased ? " · Showcased" : ""}</Text></View></View>{collection.description ? <Text className="text-sm leading-5 text-muted-foreground">{collection.description}</Text> : null}</Pressable>)}
  </Screen>;
}
