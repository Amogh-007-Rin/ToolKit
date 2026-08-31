import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, Pressable, Share, Text, View } from "react-native";
import { Ban, BookmarkPlus, Flag, LayoutGrid, MessageSquare, Share2, UserPlus, UserRound } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Screen } from "@/components/Screen";
import { getPublicProfile, importCollection, toggleFollow } from "@/services/product";
import { blockUser, reportContent } from "@/services/safety";
import { createDirectRoom } from "@/services/messages";

export default function PublicProfileScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ["public-profile", tag], queryFn: () => getPublicProfile(tag), enabled: Boolean(tag) });
  const follow = useMutation({ mutationFn: () => toggleFollow(tag), onSuccess: () => void client.invalidateQueries({ queryKey: ["public-profile", tag] }) });
  const importing = useMutation({ mutationFn: (collectionId: string) => importCollection(collectionId), onSuccess: () => { void client.invalidateQueries({ queryKey: ["collections"] }); Alert.alert("Collection imported", "A private copy is now available in Tools."); } });
  const message = useMutation({ mutationFn: (userId: string) => createDirectRoom(userId), onSuccess: ({ room }) => { void client.invalidateQueries({ queryKey: ["rooms"] }); router.push({ pathname: "/conversation/[id]", params: { id: room.id } }); }, onError: (cause) => Alert.alert("Could not start conversation", cause instanceof Error ? cause.message : "Try again later") });
  const user = profile.data?.user;
  const profileUrl = `https://toolkit.example/profile/${encodeURIComponent(tag)}`;
  const safety = () => user && Alert.alert("Profile actions", undefined, [
    { text: "Report profile", onPress: () => void reportContent("profile", user.id, "other").then(() => Alert.alert("Report submitted")) },
    { text: "Block creator", style: "destructive", onPress: () => void blockUser(user.id).then(() => router.back()) },
    { text: "Cancel", style: "cancel" },
  ]);
  return (
    <Screen title={user?.name ?? `@${tag}`} subtitle={user?.tag ? `@${user.tag}` : "Public ToolKit profile"} action={<Pressable accessibilityLabel="Profile actions" onPress={safety} className="h-11 w-11 items-center justify-center rounded-2xl bg-card"><Flag color="#6f6a87" size={19} /></Pressable>}>
      {profile.isError ? <Text accessibilityRole="alert" className="rounded-2xl bg-destructive/10 p-4 text-destructive">This profile is unavailable.</Text> : null}
      {user ? <>
        <View className="items-center gap-3 overflow-hidden rounded-3xl border border-border bg-card p-6">{user.banner ? <Image source={{ uri: user.banner }} className="absolute left-0 top-0 h-28 w-full opacity-70" /> : null}<View className="mt-10">{user.image ? <Image source={{ uri: user.image }} className="h-24 w-24 rounded-[32px] border-4 border-card" /> : <View className="h-24 w-24 items-center justify-center rounded-[32px] bg-primary/10"><UserRound color="#ed4b4b" size={36} /></View>}</View><Text className="text-2xl font-bold text-foreground">{user.name ?? `@${tag}`}</Text><Text className="text-muted-foreground">{user.followers} followers · {user.following} following</Text>{user.bio ? <Text className="text-center leading-6 text-foreground">{user.bio}</Text> : null}<View className="flex-row flex-wrap justify-center gap-2">{user.skills.map((skill) => <View key={skill} className="rounded-full bg-primary/10 px-3 py-2"><Text className="text-xs font-semibold text-primary">{skill}</Text></View>)}</View></View>
        {!user.isMe ? <View className="flex-row flex-wrap gap-2"><Pressable disabled={follow.isPending} onPress={() => follow.mutate()} className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl ${user.followedByMe ? "border border-border bg-card" : "bg-primary"}`}><UserPlus color={user.followedByMe ? "#ed4b4b" : "white"} size={18} /><Text className={user.followedByMe ? "font-bold text-foreground" : "font-bold text-white"}>{user.followedByMe ? "Following" : "Follow"}</Text></Pressable><Pressable accessibilityLabel="Message creator" disabled={message.isPending} onPress={() => message.mutate(user.id)} className="h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card disabled:opacity-50"><MessageSquare color="#ed4b4b" size={18} /></Pressable><Pressable accessibilityLabel="Share profile" onPress={() => void Share.share({ message: profileUrl })} className="h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card"><Share2 color="#ed4b4b" size={18} /></Pressable></View> : null}
        <View className="items-center gap-3 rounded-3xl border border-border bg-card p-5"><QRCode value={`toolkit://profile/${tag}`} size={132} color="#292d32" backgroundColor="transparent" /><Text className="text-sm text-muted-foreground">Scan to open this profile in ToolKit</Text></View>
        <View className="gap-3"><View className="flex-row items-center gap-2"><LayoutGrid color="#ed4b4b" size={20} /><Text className="text-lg font-bold text-foreground">Showcased collections</Text></View>{user.collections.map((collection) => <View key={collection.id} className="gap-3 rounded-3xl border border-border bg-card p-5"><Text className="text-lg font-bold text-foreground">{collection.title}</Text><Text className="text-sm text-muted-foreground">{collection.tools.length} tools · {collection.description}</Text>{!user.isMe ? <Pressable disabled={importing.isPending} onPress={() => importing.mutate(collection.id)} className="min-h-11 flex-row items-center justify-center gap-2 rounded-2xl bg-primary/10"><BookmarkPlus color="#ed4b4b" size={17} /><Text className="font-bold text-primary">Import collection</Text></Pressable> : null}</View>)}{user.collections.length === 0 ? <Text className="text-muted-foreground">No public collections.</Text> : null}</View>
        <View className="gap-3"><View className="flex-row items-center gap-2"><MessageSquare color="#ed4b4b" size={20} /><Text className="text-lg font-bold text-foreground">Posts</Text></View>{user.posts.map((post) => <Pressable key={post.id} onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })} className="overflow-hidden rounded-3xl border border-border bg-card">{post.media[0]?.url ? <Image source={{ uri: post.media[0].url }} className="h-52 w-full" /> : null}<View className="gap-1 p-4"><Text numberOfLines={3} className="text-foreground">{post.caption}</Text><Text className="text-xs text-muted-foreground">{post.likeCount} likes · {post.commentCount} comments</Text></View></Pressable>)}{user.posts.length === 0 ? <Text className="text-muted-foreground">No public posts.</Text> : null}</View>
      </> : null}
    </Screen>
  );
}
