import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera, FileImage, Images, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { LocalMedia, uploadMedia } from "@/services/media";
import { createPost } from "@/services/product";

export default function NewPostScreen() {
  const client = useQueryClient(); const [file, setFile] = useState<LocalMedia | null>(null); const [caption, setCaption] = useState(""); const [tags, setTags] = useState(""); const [progress, setProgress] = useState<number | null>(null); const controller = useRef<AbortController | null>(null);
  const fromAsset = (asset: ImagePicker.ImagePickerAsset) => setFile({ uri: asset.uri, mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"), size: asset.fileSize ?? 1, name: asset.fileName ?? undefined });
  const library = async () => { Alert.alert("Choose media", "ToolKit will access only the photo or video you select.", [{ text: "Cancel", style: "cancel" }, { text: "Continue", onPress: () => void ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.8, allowsMultipleSelection: false }).then((result) => { if (!result.canceled) fromAsset(result.assets[0]); }) }]); };
  const camera = async () => { Alert.alert("Use camera", "The camera is used only to capture media for this post.", [{ text: "Cancel", style: "cancel" }, { text: "Continue", onPress: () => void ImagePicker.launchCameraAsync({ mediaTypes: ["images", "videos"], quality: 0.8 }).then((result) => { if (!result.canceled) fromAsset(result.assets[0]); }) }]); };
  const document = async () => { const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "video/*"], copyToCacheDirectory: true }); if (!result.canceled) { const asset = result.assets[0]; setFile({ uri: asset.uri, mimeType: asset.mimeType ?? "application/octet-stream", size: asset.size ?? 1, name: asset.name }); } };
  const publish = async () => { if (!file || progress !== null) return; controller.current = new AbortController(); setProgress(0); try { const uploaded = await uploadMedia(file, "post", setProgress, undefined, controller.current.signal); await createPost(caption.trim(), tags.split(/[ ,#]+/).map((tag) => tag.trim()).filter(Boolean).slice(0, 30), [{ key: uploaded.key, type: uploaded.kind, order: 0 }]); void client.invalidateQueries({ queryKey: ["discover"] }); router.back(); } catch (cause) { Alert.alert("Could not publish", cause instanceof Error ? cause.message : "Upload failed"); setProgress(null); } };
  return <Screen title="Create post" subtitle="Share a photo or video with your ToolKit community.">
    {file ? <View className="overflow-hidden rounded-3xl border border-border bg-card">{file.mimeType.startsWith("image/") ? <Image source={{ uri: file.uri }} className="h-80 w-full" resizeMode="cover" /> : <View className="h-52 items-center justify-center"><FileImage color="#ed4b4b" size={40} /><Text className="mt-3 text-foreground">{file.name ?? "Selected video"}</Text></View>}<Pressable accessibilityLabel="Remove media" onPress={() => setFile(null)} className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-black/60"><X color="white" size={20} /></Pressable></View> : <View className="gap-3 rounded-3xl border border-border bg-card p-5"><Text className="font-bold text-foreground">Add media</Text><View className="flex-row gap-2"><Choice icon={Images} label="Library" onPress={() => void library()} /><Choice icon={Camera} label="Camera" onPress={() => void camera()} /><Choice icon={FileImage} label="Files" onPress={() => void document()} /></View></View>}
    <TextInput value={caption} onChangeText={setCaption} multiline maxLength={2200} placeholder="Write a caption…" className="min-h-28 rounded-3xl border border-border bg-card px-4 py-4 text-foreground" />
    <TextInput value={tags} onChangeText={setTags} placeholder="Tags, separated by commas" className="h-14 rounded-2xl bg-input px-4 text-foreground" />
    {progress !== null ? <View className="gap-2"><View className="h-2 overflow-hidden rounded-full bg-border"><View style={{ width: `${Math.round(progress * 100)}%` }} className="h-full bg-primary" /></View><Pressable onPress={() => controller.current?.abort()}><Text className="text-center font-semibold text-destructive">Cancel upload</Text></Pressable></View> : null}
    <Pressable disabled={!file || progress !== null} onPress={() => void publish()} className="min-h-14 items-center justify-center rounded-2xl bg-primary disabled:opacity-50"><Text className="font-bold text-white">Publish post</Text></Pressable>
  </Screen>;
}
function Choice({ icon: Icon, label, onPress }: { icon: typeof Images; label: string; onPress: () => void }) { return <Pressable onPress={onPress} className="min-h-20 flex-1 items-center justify-center gap-2 rounded-2xl bg-input"><Icon color="#ed4b4b" size={22} /><Text className="text-xs font-semibold text-foreground">{label}</Text></Pressable>; }
