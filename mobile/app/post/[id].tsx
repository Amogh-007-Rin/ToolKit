import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Bookmark, ChevronLeft, ChevronRight, FilePlus2, Heart, MessageCircle, MoreHorizontal, Send, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { MediaViewer } from "@/components/MediaViewer";
import { LocalMedia, uploadMedia } from "@/services/media";
import { createComment, deleteComment, deletePost, getComments, getPost, togglePostLike, togglePostSave, updatePost } from "@/services/product";
import { blockUser, reportContent } from "@/services/safety";

const MAX_MEDIA = 10;
type EditableMedia = { id?: string; type: string; url?: string; file?: LocalMedia };

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [editMedia, setEditMedia] = useState<EditableMedia[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const uploadController = useRef<AbortController | null>(null);
  const post = useQuery({ queryKey: ["post", id], queryFn: () => getPost(id) });
  const comments = useQuery({ queryKey: ["comments", id], queryFn: () => getComments(id) });
  const refresh = () => { void client.invalidateQueries({ queryKey: ["post", id] }); void client.invalidateQueries({ queryKey: ["discover"] }); };
  const like = useMutation({ mutationFn: () => togglePostLike(id), onMutate: async () => { await client.cancelQueries({ queryKey: ["post", id] }); const old = client.getQueryData<{ post: NonNullable<typeof post.data>["post"] }>(["post", id]); if (old) client.setQueryData(["post", id], { post: { ...old.post, likedByMe: !old.post.likedByMe, likeCount: old.post.likeCount + (old.post.likedByMe ? -1 : 1) } }); return { old }; }, onError: (_e, _v, context) => { if (context?.old) client.setQueryData(["post", id], context.old); }, onSettled: refresh });
  const save = useMutation({ mutationFn: () => togglePostSave(id), onSuccess: refresh });
  const send = useMutation({ mutationFn: () => createComment(id, comment.trim()), onSuccess: () => { setComment(""); void client.invalidateQueries({ queryKey: ["comments", id] }); refresh(); } });
  const item = post.data?.post;

  const beginEditing = () => {
    if (!item) return;
    setCaption(item.caption); setTags(item.tags.join(", "));
    setEditMedia(item.media.map((media) => ({ id: media.id, type: media.type, url: media.url })));
    setRemovedMediaIds([]); setEditing(true);
  };
  const menu = () => {
    if (!item) return;
    Alert.alert("Post actions", undefined, item.mine
      ? [{ text: "Edit", onPress: beginEditing }, { text: "Delete", style: "destructive", onPress: () => void deletePost(id).then(() => { void client.invalidateQueries({ queryKey: ["discover"] }); router.back(); }) }, { text: "Cancel", style: "cancel" }]
      : [{ text: "Report post", onPress: () => void reportContent("post", id, "other").then(() => Alert.alert("Report submitted")) }, { text: "Block creator", style: "destructive", onPress: () => void blockUser(item.author.id).then(() => router.back()) }, { text: "Cancel", style: "cancel" }]);
  };
  const appendFiles = (files: LocalMedia[]) => setEditMedia((current) => [...current, ...files.map((file) => ({ type: file.mimeType.startsWith("video/") ? "video" : "image", file }))].slice(0, MAX_MEDIA));
  const pickMedia = () => Alert.alert("Add media", "Choose where to select an image or video.", [
    { text: "Photo library", onPress: () => void ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: true, selectionLimit: MAX_MEDIA - editMedia.length, quality: 0.8 }).then((result) => { if (!result.canceled) appendFiles(result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"), size: asset.fileSize ?? 1, name: asset.fileName ?? undefined }))); }) },
    { text: "Camera", onPress: () => void ImagePicker.launchCameraAsync({ mediaTypes: ["images", "videos"], quality: 0.8 }).then((result) => { if (!result.canceled) appendFiles(result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"), size: asset.fileSize ?? 1, name: asset.fileName ?? undefined }))); }) },
    { text: "Files", onPress: () => void DocumentPicker.getDocumentAsync({ type: ["image/*", "video/*"], multiple: true, copyToCacheDirectory: true }).then((result) => { if (!result.canceled) appendFiles(result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg", size: asset.size ?? 1, name: asset.name }))); }) },
    { text: "Cancel", style: "cancel" },
  ]);
  const removeMedia = (index: number) => setEditMedia((current) => { const target = current[index]; if (target?.id) setRemovedMediaIds((ids) => [...ids, target.id!]); return current.filter((_, currentIndex) => currentIndex !== index); });
  const moveMedia = (index: number, direction: -1 | 1) => setEditMedia((current) => { const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const submitEdit = async () => {
    if (!editMedia.length || progress !== null) return;
    uploadController.current = new AbortController();
    const newCount = editMedia.filter((media) => media.file).length; let uploadedCount = 0;
    setProgress(newCount ? 0 : 1);
    try {
      const media: Array<{ id?: string; key?: string; type: string }> = [];
      for (const entry of editMedia) {
        if (entry.id) media.push({ id: entry.id, type: entry.type });
        else if (entry.file) { const uploaded = await uploadMedia(entry.file, "post", (value) => setProgress((uploadedCount + value) / Math.max(newCount, 1)), undefined, uploadController.current.signal); uploadedCount += 1; media.push({ key: uploaded.key, type: uploaded.kind }); }
      }
      await updatePost(id, caption.trim(), tags.split(/[ ,#]+/).filter(Boolean).slice(0, 30), media, removedMediaIds);
      setEditing(false); setProgress(null); refresh();
    } catch (cause) { setProgress(null); Alert.alert("Could not update post", cause instanceof Error ? cause.message : "Update failed"); }
  };

  return <Screen title="Post" subtitle={item ? new Date(item.createdAt).toLocaleString() : "Loading…"} action={<Pressable accessibilityLabel="Post actions" onPress={menu} className="h-11 w-11 items-center justify-center rounded-2xl bg-card"><MoreHorizontal color="#292d32" size={21} /></Pressable>}>
    {!editing && item?.media.length ? <MediaViewer media={item.media} height={420} /> : null}
    {editing ? <View className="gap-4 rounded-3xl border border-border bg-card p-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">{editMedia.map((media, index) => <View key={media.id ?? `${media.file?.uri}-${index}`} className="h-44 w-40 overflow-hidden rounded-2xl bg-black">{media.type === "image" ? <Image source={{ uri: media.url ?? media.file?.uri }} className="h-full w-full" resizeMode="cover" /> : <View className="flex-1 items-center justify-center px-3"><Text className="text-center font-semibold text-white">Video {index + 1}</Text></View>}<Pressable accessibilityLabel={`Remove media ${index + 1}`} onPress={() => removeMedia(index)} className="absolute right-1 top-1 h-11 w-11 items-center justify-center rounded-full bg-black/70"><X color="white" size={19} /></Pressable><View className="absolute bottom-1 left-1 flex-row gap-1"><Pressable accessibilityLabel="Move media left" disabled={index === 0} onPress={() => moveMedia(index, -1)} className="h-10 w-10 items-center justify-center rounded-full bg-black/70 disabled:opacity-30"><ChevronLeft color="white" size={18} /></Pressable><Pressable accessibilityLabel="Move media right" disabled={index === editMedia.length - 1} onPress={() => moveMedia(index, 1)} className="h-10 w-10 items-center justify-center rounded-full bg-black/70 disabled:opacity-30"><ChevronRight color="white" size={18} /></Pressable></View></View>)}</ScrollView>
      {editMedia.length < MAX_MEDIA ? <Pressable accessibilityLabel="Add post media" onPress={pickMedia} className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-input"><FilePlus2 color="#ed4b4b" size={19} /><Text className="font-semibold text-foreground">Add media · {editMedia.length}/{MAX_MEDIA}</Text></Pressable> : null}
      <TextInput value={caption} onChangeText={setCaption} multiline maxLength={2200} placeholder="Write a caption…" className="min-h-24 rounded-2xl bg-input p-3 text-foreground" /><TextInput value={tags} onChangeText={setTags} placeholder="Tags, separated by commas" className="min-h-12 rounded-2xl bg-input px-3 text-foreground" />
      {progress !== null && progress < 1 ? <View className="gap-2"><View className="h-2 overflow-hidden rounded-full bg-border"><View className="h-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} /></View><Pressable onPress={() => uploadController.current?.abort()}><Text className="text-center font-semibold text-destructive">Cancel upload</Text></Pressable></View> : null}
      <View className="flex-row gap-2"><Pressable disabled={!editMedia.length || progress !== null} onPress={() => void submitEdit()} className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-primary disabled:opacity-50"><Text className="font-bold text-white">Save changes</Text></Pressable><Pressable disabled={progress !== null} onPress={() => setEditing(false)} className="min-h-12 items-center justify-center rounded-2xl bg-input px-5"><Text className="font-semibold text-foreground">Cancel</Text></Pressable></View>
    </View> : item ? <View className="gap-3 rounded-3xl border border-border bg-card p-4"><Text className="font-bold text-foreground">{item.author.name ?? item.author.tag ?? "Creator"}</Text><Text className="leading-6 text-foreground">{item.caption}</Text><View className="flex-row gap-3"><Pressable accessibilityLabel="Like post" onPress={() => like.mutate()} className="min-h-11 flex-row items-center gap-2 rounded-2xl bg-input px-4"><Heart color={item.likedByMe ? "#ed4b4b" : "#6f6a87"} fill={item.likedByMe ? "#ed4b4b" : "transparent"} size={19} /><Text className="text-foreground">{item.likeCount}</Text></Pressable><Pressable accessibilityLabel="Save post" onPress={() => save.mutate()} className="min-h-11 flex-row items-center gap-2 rounded-2xl bg-input px-4"><Bookmark color="#6f6a87" fill={item.savedByMe ? "#6f6a87" : "transparent"} size={19} /><Text className="text-foreground">Save</Text></Pressable></View></View> : null}
    <View className="gap-3"><View className="flex-row items-center gap-2"><MessageCircle color="#ed4b4b" size={20} /><Text className="text-lg font-bold text-foreground">Comments</Text></View>{comments.data?.comments.map((entry) => <Pressable onLongPress={() => entry.mine ? deleteComment(id, entry.id).then(() => client.invalidateQueries({ queryKey: ["comments", id] })) : reportContent("comment", entry.id, "other").then(() => Alert.alert("Report submitted"))} key={entry.id} className="rounded-2xl bg-card p-4"><Text className="font-semibold text-foreground">{entry.user.name ?? entry.user.tag ?? "Creator"}</Text><Text className="mt-1 text-foreground">{entry.content}</Text></Pressable>)}<View className="flex-row items-end gap-2 rounded-3xl border border-border bg-card p-2 pl-4"><TextInput value={comment} onChangeText={setComment} multiline placeholder="Add a comment…" className="min-h-12 flex-1 py-3 text-foreground" /><Pressable disabled={!comment.trim() || send.isPending} onPress={() => send.mutate()} className="h-12 w-12 items-center justify-center rounded-2xl bg-primary disabled:opacity-50"><Send color="white" size={18} /></Pressable></View></View>
  </Screen>;
}
