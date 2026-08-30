import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ExternalLink, Plus, Star, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, Linking, Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { isSafeExternalUrl } from "@/lib/links";
import { createTool, deleteCollection, deleteTool, getCollections, setShowcase } from "@/services/product";

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const client = useQueryClient();
  const [adding, setAdding] = useState(false); const [name, setName] = useState(""); const [link, setLink] = useState(""); const [description, setDescription] = useState("");
  const collections = useQuery({ queryKey: ["collections"], queryFn: getCollections }); const collection = collections.data?.collections.find((item) => item.id === id);
  const refresh = () => client.invalidateQueries({ queryKey: ["collections"] });
  const add = useMutation({ mutationFn: () => createTool(id, { name: name.trim(), link: link.trim(), description: description.trim() }), onSuccess: () => { setName(""); setLink(""); setDescription(""); setAdding(false); void refresh(); } });
  const removeTool = useMutation({ mutationFn: (toolId: string) => deleteTool(id, toolId), onSuccess: () => void refresh() });
  const showcase = useMutation({ mutationFn: () => setShowcase(collection?.showcased ? [] : [id]), onSuccess: () => void refresh() });
  const remove = () => Alert.alert("Delete collection?", "Its tools will also be deleted.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void deleteCollection(id).then(() => { void refresh(); router.back(); }) }]);
  return <Screen title={collection?.title ?? "Collection"} subtitle={collection?.description || "Manage this collection and its tools."} action={<Pressable accessibilityLabel="Add tool" onPress={() => setAdding((value) => !value)} className="h-11 w-11 items-center justify-center rounded-2xl bg-primary"><Plus color="white" size={21} /></Pressable>}>
    {adding ? <View className="gap-3 rounded-3xl border border-border bg-card p-4"><TextInput value={name} onChangeText={setName} placeholder="Tool name" className="h-12 rounded-2xl bg-input px-4 text-foreground" /><TextInput value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" placeholder="https://…" className="h-12 rounded-2xl bg-input px-4 text-foreground" /><TextInput value={description} onChangeText={setDescription} placeholder="Description" className="h-12 rounded-2xl bg-input px-4 text-foreground" /><Pressable disabled={!name.trim() || add.isPending} onPress={() => add.mutate()} className="min-h-12 items-center justify-center rounded-2xl bg-primary disabled:opacity-50"><Text className="font-bold text-white">Add tool</Text></Pressable></View> : null}
    {collection?.tools.map((tool) => <View key={tool.id} className="gap-2 rounded-3xl border border-border bg-card p-4"><Text className="text-lg font-bold text-foreground">{tool.name}</Text>{tool.description ? <Text className="text-muted-foreground">{tool.description}</Text> : null}<View className="flex-row gap-2">{tool.link && isSafeExternalUrl(tool.link) ? <Pressable onPress={() => void Linking.openURL(tool.link!)} className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary/10"><ExternalLink color="#ed4b4b" size={17} /><Text className="font-semibold text-primary">Open</Text></Pressable> : null}<Pressable accessibilityLabel={`Delete ${tool.name}`} onPress={() => removeTool.mutate(tool.id)} className="h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10"><Trash2 color="#ed4b4b" size={17} /></Pressable></View></View>)}
    <Pressable onPress={() => showcase.mutate()} className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-border"><Star color="#ed4b4b" size={18} fill={collection?.showcased ? "#ed4b4b" : "transparent"} /><Text className="font-semibold text-foreground">{collection?.showcased ? "Remove from showcase" : "Showcase collection"}</Text></Pressable>
    <Pressable onPress={remove} className="min-h-12 items-center justify-center"><Text className="font-semibold text-destructive">Delete collection</Text></Pressable>
  </Screen>;
}
