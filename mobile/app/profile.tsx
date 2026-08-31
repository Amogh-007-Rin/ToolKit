import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Camera, Share2, UserRound } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, Share, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { LocalMedia, uploadMedia } from "@/services/media";
import { getProfile, updateProfile } from "@/services/product";

export default function ProfileScreen() {
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", tag: "", bio: "", role: "", location: "", skills: "" });
  const [image, setImage] = useState<{ preview: string | null; key?: string | null }>({ preview: null });
  const [banner, setBanner] = useState<{ preview: string | null; key?: string | null }>({ preview: null });
  const [uploading, setUploading] = useState<"image" | "banner" | null>(null);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => { const user = profile.data?.user; if (user) { setForm({ name: user.name ?? "", tag: user.tag ?? "", bio: user.bio ?? "", role: user.role ?? "", location: user.location ?? "", skills: user.skills.join(", ") }); setImage({ preview: user.image }); setBanner({ preview: user.banner }); } }, [profile.data]);
  const save = useMutation({ mutationFn: () => updateProfile({ name: form.name.trim(), tag: form.tag.trim() || null, bio: form.bio.trim(), role: form.role.trim(), location: form.location.trim(), skills: form.skills.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 5), ...(image.key !== undefined ? { image: image.key } : {}), ...(banner.key !== undefined ? { banner: banner.key } : {}) }), onSuccess: () => { setEditing(false); void client.invalidateQueries({ queryKey: ["profile"] }); } });
  const user = profile.data?.user;
  const chooseMedia = (scope: "image" | "banner") => Alert.alert(scope === "image" ? "Profile photo" : "Profile banner", "ToolKit will access only the image you select.", [
    { text: "Choose photo", onPress: () => void ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: scope === "image" ? [1, 1] : [3, 1] }).then((result) => { if (!result.canceled) void uploadSelection(scope, { uri: result.assets[0].uri, mimeType: result.assets[0].mimeType ?? "image/jpeg", size: result.assets[0].fileSize ?? 1, name: result.assets[0].fileName ?? undefined }); }) },
    { text: "Take photo", onPress: () => void ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: scope === "image" ? [1, 1] : [3, 1] }).then((result) => { if (!result.canceled) void uploadSelection(scope, { uri: result.assets[0].uri, mimeType: result.assets[0].mimeType ?? "image/jpeg", size: result.assets[0].fileSize ?? 1, name: result.assets[0].fileName ?? undefined }); }) },
    { text: "Remove", style: "destructive", onPress: () => scope === "image" ? setImage({ preview: null, key: null }) : setBanner({ preview: null, key: null }) },
    { text: "Cancel", style: "cancel" },
  ]);
  const uploadSelection = async (scope: "image" | "banner", file: LocalMedia) => {
    uploadController.current = new AbortController(); setUploading(scope);
    try { const uploaded = await uploadMedia(file, scope === "image" ? "profile" : "banner", () => undefined, undefined, uploadController.current.signal); const next = { preview: file.uri, key: uploaded.key }; if (scope === "image") setImage(next); else setBanner(next); }
    catch (cause) { Alert.alert("Upload failed", cause instanceof Error ? cause.message : "Could not upload image"); }
    finally { setUploading(null); }
  };
  return <Screen title="Profile" subtitle="Your public identity on ToolKit." action={<Pressable onPress={() => setEditing((value) => !value)} className="min-h-11 justify-center rounded-2xl bg-primary px-4"><Text className="font-bold text-white">{editing ? "Cancel" : "Edit"}</Text></Pressable>}>
    <View className="items-center gap-3 overflow-hidden rounded-3xl border border-border bg-card p-6">{banner.preview ? <Image source={{ uri: banner.preview }} className="absolute left-0 top-0 h-28 w-full opacity-75" /> : null}<View className="mt-10">{image.preview ? <Image source={{ uri: image.preview }} className="h-24 w-24 rounded-[32px] border-4 border-card" /> : <View className="h-24 w-24 items-center justify-center rounded-[32px] bg-primary/10"><UserRound color="#ed4b4b" size={36} /></View>}{editing ? <Pressable accessibilityLabel="Change profile photo" disabled={uploading !== null} onPress={() => chooseMedia("image")} className="absolute -bottom-2 -right-2 h-11 w-11 items-center justify-center rounded-full bg-primary"><Camera color="white" size={18} /></Pressable> : null}</View><Text className="text-2xl font-bold text-foreground">{user?.name ?? "ToolKit creator"}</Text>{user?.tag ? <Text className="text-primary">@{user.tag}</Text> : null}<Text className="text-muted-foreground">{user?.followers ?? 0} followers · {user?.following ?? 0} following</Text>{editing ? <Pressable accessibilityLabel="Change profile banner" disabled={uploading !== null} onPress={() => chooseMedia("banner")} className="min-h-11 flex-row items-center gap-2 rounded-2xl bg-card/90 px-4"><Camera color="#ed4b4b" size={17} /><Text className="font-semibold text-foreground">{uploading === "banner" ? "Uploading…" : "Change banner"}</Text></Pressable> : null}</View>
    {editing ? <View className="gap-3 rounded-3xl border border-border bg-card p-5">{([["name", "Name"], ["tag", "Unique tag"], ["bio", "Bio"], ["role", "Role"], ["location", "Location"], ["skills", "Skills, comma separated"]] as const).map(([key, label]) => <TextInput key={key} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={label} multiline={key === "bio"} className={`${key === "bio" ? "min-h-24 py-3" : "h-12"} rounded-2xl bg-input px-4 text-foreground`} />)}{save.isError ? <Text className="text-destructive">{save.error.message}</Text> : null}<Pressable disabled={!form.name.trim() || save.isPending || uploading !== null} onPress={() => save.mutate()} className="min-h-12 items-center justify-center rounded-2xl bg-primary disabled:opacity-50"><Text className="font-bold text-white">Save profile</Text></Pressable></View> : <View className="gap-3 rounded-3xl border border-border bg-card p-5"><Text className="leading-6 text-foreground">{user?.bio || "Add a short bio to help creators understand your toolkit."}</Text>{user?.role || user?.location ? <Text className="text-muted-foreground">{[user.role, user.location].filter(Boolean).join(" · ")}</Text> : null}<View className="flex-row flex-wrap gap-2">{user?.skills.map((skill) => <View key={skill} className="rounded-full bg-primary/10 px-3 py-2"><Text className="text-xs font-semibold text-primary">{skill}</Text></View>)}</View></View>}
    <Pressable disabled={!user?.tag} onPress={() => void Share.share({ message: `https://toolkit.example/profile/${user?.tag}` })} className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-border"><Share2 color="#ed4b4b" size={18} /><Text className="font-bold text-foreground">Share profile</Text></Pressable>
  </Screen>;
}
