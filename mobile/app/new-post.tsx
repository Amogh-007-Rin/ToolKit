import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera, ChevronLeft, ChevronRight, FileImage, Images, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { launchCamera, launchMediaLibrary } from "@/lib/mediaPicker";
import { createPostWithQueuedMedia, LocalMedia } from "@/services/media";

const MAX_MEDIA = 10;

export default function NewPostScreen() {
  const client = useQueryClient();
  const [files, setFiles] = useState<LocalMedia[]>([]);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const append = (next: LocalMedia[]) => setFiles((current) => [...current, ...next].slice(0, MAX_MEDIA));
  const fromAsset = (asset: ImagePicker.ImagePickerAsset): LocalMedia => ({ uri: asset.uri, mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"), size: asset.fileSize ?? 1, name: asset.fileName ?? undefined });
  const library = async () => { Alert.alert("Choose media", "ToolKit will access only the photos or videos you select.", [{ text: "Cancel", style: "cancel" }, { text: "Continue", onPress: () => void launchMediaLibrary({ mediaTypes: ["images", "videos"], quality: 0.8, allowsMultipleSelection: true, selectionLimit: MAX_MEDIA - files.length }).then((result) => { if (result && !result.canceled) append(result.assets.map(fromAsset)); }) }]); };
  const camera = async () => { Alert.alert("Use camera", "The camera is used only to capture media for this post.", [{ text: "Cancel", style: "cancel" }, { text: "Continue", onPress: () => void launchCamera({ mediaTypes: ["images", "videos"], quality: 0.8 }).then((result) => { if (result && !result.canceled) append([fromAsset(result.assets[0])]); }) }]); };
  const document = async () => { const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "video/*"], copyToCacheDirectory: true, multiple: true }); if (!result.canceled) append(result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType ?? "application/octet-stream", size: asset.size ?? 1, name: asset.name }))); };
  const remove = (index: number) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const move = (index: number, direction: -1 | 1) => setFiles((current) => { const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const publish = async () => { if (!files.length || progress !== null) return; controller.current = new AbortController(); setProgress(0); try { const result = await createPostWithQueuedMedia(files, caption.trim(), tags.split(/[ ,#]+/).map((tag) => tag.trim()).filter(Boolean).slice(0, 30), setProgress); void client.invalidateQueries({ queryKey: ["discover"] }); if (result.queued) Alert.alert("Saved for upload", "Your post and media are safely stored on this device and will publish when connectivity returns."); router.back(); } catch (cause) { Alert.alert("Could not save post", cause instanceof Error ? cause.message : "Could not preserve the selected media"); setProgress(null); } };
  return <Screen title="Create post" subtitle={`Share up to ${MAX_MEDIA} photos or videos with your ToolKit community.`}>
    {files.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">{files.map((file, index) => <View key={`${file.uri}-${index}`} className="h-60 w-64 overflow-hidden rounded-3xl border border-border bg-card">{file.mimeType.startsWith("image/") ? <Image source={{ uri: file.uri }} className="h-full w-full" resizeMode="cover" /> : <View className="flex-1 items-center justify-center"><FileImage color="#ed4b4b" size={40} /><Text numberOfLines={2} className="mt-3 px-4 text-center text-foreground">{file.name ?? "Selected video"}</Text></View>}<Pressable accessibilityLabel={`Remove media ${index + 1}`} onPress={() => remove(index)} className="absolute right-2 top-2 h-11 w-11 items-center justify-center rounded-full bg-black/60"><X color="white" size={20} /></Pressable><View className="absolute bottom-2 left-2 flex-row gap-2"><Pressable accessibilityLabel="Move media left" disabled={index === 0} onPress={() => move(index, -1)} className="h-10 w-10 items-center justify-center rounded-full bg-black/60 disabled:opacity-30"><ChevronLeft color="white" size={19} /></Pressable><Pressable accessibilityLabel="Move media right" disabled={index === files.length - 1} onPress={() => move(index, 1)} className="h-10 w-10 items-center justify-center rounded-full bg-black/60 disabled:opacity-30"><ChevronRight color="white" size={19} /></Pressable></View><View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-2"><Text className="text-xs font-bold text-white">{index + 1}</Text></View></View>)}</ScrollView> : null}
    {files.length < MAX_MEDIA ? <View className="gap-3 rounded-3xl border border-border bg-card p-5"><Text className="font-bold text-foreground">{files.length ? `Add more media · ${files.length}/${MAX_MEDIA}` : "Add media"}</Text><View className="flex-row gap-2"><Choice icon={Images} label="Library" onPress={() => void library()} /><Choice icon={Camera} label="Camera" onPress={() => void camera()} /><Choice icon={FileImage} label="Files" onPress={() => void document()} /></View></View> : null}
    <TextInput value={caption} onChangeText={setCaption} multiline maxLength={2200} placeholder="Write a caption…" className="min-h-28 rounded-3xl border border-border bg-card px-4 py-4 text-foreground" /><TextInput value={tags} onChangeText={setTags} placeholder="Tags, separated by commas" className="h-14 rounded-2xl bg-input px-4 text-foreground" />
    {progress !== null ? <View className="gap-2"><View className="h-2 overflow-hidden rounded-full bg-border"><View style={{ width: `${Math.round(progress * 100)}%` }} className="h-full bg-primary" /></View><Text className="text-center text-xs text-muted-foreground">Uploading {Math.round(progress * 100)}%</Text><Pressable onPress={() => controller.current?.abort()}><Text className="text-center font-semibold text-destructive">Cancel upload</Text></Pressable></View> : null}
    <Pressable disabled={!files.length || progress !== null} onPress={() => void publish()} className="min-h-14 items-center justify-center rounded-2xl bg-primary disabled:opacity-50"><Text className="font-bold text-white">Publish post</Text></Pressable>
  </Screen>;
}
function Choice({ icon: Icon, label, onPress }: { icon: typeof Images; label: string; onPress: () => void }) { return <Pressable onPress={onPress} className="min-h-20 flex-1 items-center justify-center gap-2 rounded-2xl bg-input"><Icon color="#ed4b4b" size={22} /><Text className="text-xs font-semibold text-foreground">{label}</Text></Pressable>; }
