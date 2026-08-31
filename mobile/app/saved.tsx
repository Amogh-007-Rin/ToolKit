import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Bookmark, ImageIcon } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { getSavedPosts, togglePostSave } from "@/services/product";

export default function SavedScreen() {
  const client = useQueryClient();
  const saved = useQuery({ queryKey: ["saved-posts"], queryFn: getSavedPosts });
  const remove = useMutation({ mutationFn: togglePostSave, onSuccess: () => void client.invalidateQueries({ queryKey: ["saved-posts"] }) });
  return <Screen title="Saved posts" subtitle="Posts you bookmarked for later.">{saved.data?.posts.map((post) => <View key={post.id} className="overflow-hidden rounded-3xl border border-border bg-card"><Pressable onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })}>{post.media[0]?.url ? <Image source={{ uri: post.media[0].url }} className="h-56 w-full" /> : <View className="h-28 items-center justify-center bg-muted"><ImageIcon color="#6f6a87" size={28} /></View>}<View className="gap-2 p-4"><Text className="font-bold text-foreground">{post.author.name ?? post.author.tag ?? "Creator"}</Text><Text numberOfLines={3} className="text-foreground">{post.caption}</Text></View></Pressable><Pressable onPress={() => remove.mutate(post.id)} className="mx-4 mb-4 min-h-11 flex-row items-center justify-center gap-2 rounded-2xl bg-primary/10"><Bookmark color="#ed4b4b" fill="#ed4b4b" size={17} /><Text className="font-bold text-primary">Remove bookmark</Text></Pressable></View>)}{saved.data?.posts.length === 0 ? <View className="items-center gap-3 rounded-3xl bg-card p-10"><Bookmark color="#ed4b4b" size={30} /><Text className="font-bold text-foreground">Nothing saved yet</Text></View> : null}</Screen>;
}
