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
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const client = useQueryClient();
  const collections = useQuery({ queryKey: ["collections"], queryFn: getCollections });
  const create = useMutation({ mutationFn: () => createCollection(title.trim(), description.trim()), onSuccess: () => { setTitle(""); setDescription(""); setCreating(false); void client.invalidateQueries({ queryKey: ["collections"] }); } });
  const filtered = (collections.data?.collections ?? []).filter((collection) => `${collection.title} ${collection.description} ${collection.tools.map((tool) => tool.name).join(" ")}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  return <Screen title="My Collections" refreshing={collections.isRefetching} onRefresh={() => void collections.refetch()} action={<Pressable accessibilityLabel="New collection" onPress={() => setCreating((value) => !value)} className="h-10 flex-row items-center gap-2 rounded-xl bg-primary px-3"><Plus color="white" size={18} /><Text className="text-xs font-semibold text-white">Collection</Text></Pressable>}>
    <View className="flex-row items-center gap-3 rounded-full border border-border bg-card px-4"><Search color="#6f6a87" size={19} /><TextInput accessibilityLabel="Search collections" value={search} onChangeText={setSearch} placeholder="Search tools..." className="min-h-12 flex-1 text-sm text-foreground" /></View>
    {creating ? <View className="gap-3 rounded-3xl border border-border bg-card p-4"><Text className="font-bold text-foreground">New collection</Text><TextInput value={title} onChangeText={setTitle} placeholder="Collection title" className="h-12 rounded-xl bg-input px-4 text-foreground" /><TextInput value={description} onChangeText={setDescription} multiline placeholder="Description" className="min-h-24 rounded-xl bg-input px-4 py-3 text-foreground" /><Pressable disabled={!title.trim() || create.isPending} onPress={() => create.mutate()} className="h-12 items-center justify-center rounded-xl bg-primary disabled:opacity-50">{create.isPending ? <ActivityIndicator color="white" /> : <Text className="font-bold text-white">Create</Text>}</Pressable></View> : null}
    {collections.isPending ? <ActivityIndicator color="#ed4b4b" /> : null}
    {collections.isError ? <Text accessibilityRole="alert" className="rounded-2xl bg-destructive/10 p-4 text-destructive">Could not load collections.</Text> : null}
    {collections.data?.collections.length === 0 ? <FeatureCard icon={FolderPlus} title="Create your first collection" detail="Group related tools, add descriptions, and showcase your favorites." /> : null}
    {search.trim() && !filtered.length && !collections.isPending ? <Text className="py-10 text-center text-muted-foreground">No collections match “{search.trim()}”.</Text> : null}
    {filtered.map((collection) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/collection/[id]", params: { id: collection.id } })} key={collection.id} className="min-h-56 gap-3 overflow-hidden rounded-3xl border border-border bg-card p-5"><View className="flex-row items-start justify-between gap-3"><View className="min-w-0 flex-1"><Text numberOfLines={1} className="text-lg font-semibold text-foreground">{collection.title}</Text><View className="mt-1 self-start rounded-full border border-border bg-background px-2 py-1"><Text className="text-[11px] font-medium text-muted-foreground">{collection.tools.length} {collection.tools.length === 1 ? "tool" : "tools"}</Text></View></View><View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><LayoutGrid color="#ed4b4b" size={19} /></View></View><Text numberOfLines={3} className="text-sm leading-5 text-muted-foreground">{collection.description || "No description"}</Text>{collection.tools.length ? <View className="mt-auto flex-row items-center border-t border-border pt-4">{collection.tools.slice(0, 8).map((tool, index) => <View style={{ marginLeft: index ? -8 : 0 }} key={tool.id} className="h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted"><Text className="text-[10px] font-bold text-muted-foreground">{tool.name.slice(0, 1).toUpperCase()}</Text></View>)}{collection.tools.length > 8 ? <Text className="ml-2 text-xs text-muted-foreground">+{collection.tools.length - 8} more</Text> : null}</View> : null}</Pressable>)}
  </Screen>;
}
