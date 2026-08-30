import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Download, KeyRound, Laptop, Shield, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { changePassword, getPrivacy, getSessions, logoutAll, PrivacyPreferences, scheduleDeletion, shareDataExport, updatePrivacy } from "@/services/account";
import { useSessionStore } from "@/store/session";

export default function AccountScreen() {
  const client = useQueryClient(); const clear = useSessionStore((state) => state.clear);
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState("");
  const privacy = useQuery({ queryKey: ["privacy"], queryFn: getPrivacy }); const sessions = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
  const setPrivacy = useMutation({ mutationFn: (value: Partial<PrivacyPreferences>) => updatePrivacy(value), onSuccess: () => void client.invalidateQueries({ queryKey: ["privacy"] }) });
  const password = useMutation({ mutationFn: () => changePassword(currentPassword, newPassword), onSuccess: () => { setCurrentPassword(""); setNewPassword(""); Alert.alert("Password changed"); } });
  const deleteAccount = () => Alert.alert("Schedule account deletion?", "Your account will be hidden immediately. You have 30 days to restore it before permanent deletion.", [{ text: "Cancel", style: "cancel" }, { text: "Schedule deletion", style: "destructive", onPress: () => void scheduleDeletion().then(async () => { await clear(); router.replace("/auth"); }) }]);
  return <Screen title="Account and privacy" subtitle="Security, discoverability, sessions, export, and deletion.">
    <Section icon={Shield} title="Privacy">{privacy.data ? <>{Object.entries({ discoverable: "Appear in creator search", showPosts: "Show posts publicly", showCollections: "Show collections publicly" } as const).map(([key, label]) => <Row key={key} label={label} value={privacy.data.preferences[key as keyof PrivacyPreferences]} onChange={(value) => setPrivacy.mutate({ [key]: value })} />)}</> : <Text className="text-muted-foreground">Loading privacy settings…</Text>}</Section>
    <Section icon={KeyRound} title="Change password"><TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Current password" className="h-12 rounded-2xl bg-input px-4 text-foreground" /><TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="New password (8+ characters)" className="h-12 rounded-2xl bg-input px-4 text-foreground" /><Pressable disabled={!currentPassword || newPassword.length < 8 || password.isPending} onPress={() => password.mutate()} className="min-h-12 items-center justify-center rounded-2xl bg-primary disabled:opacity-50"><Text className="font-bold text-white">Update password</Text></Pressable>{password.isError ? <Text className="text-destructive">{password.error.message}</Text> : null}</Section>
    <Section icon={Laptop} title="Active devices">{sessions.data?.sessions.map((session) => <View key={session.id} className="border-b border-border py-2"><Text className="font-semibold text-foreground">{session.deviceName ?? "ToolKit device"}</Text><Text className="text-xs text-muted-foreground">Last used {new Date(session.lastUsedAt).toLocaleString()}</Text></View>)}<Pressable onPress={() => void logoutAll().then(async () => { await clear(); router.replace("/auth"); })} className="min-h-12 items-center justify-center rounded-2xl bg-destructive/10"><Text className="font-bold text-destructive">Sign out all devices</Text></Pressable></Section>
    <Section icon={Download} title="Your data"><Pressable onPress={() => void shareDataExport().catch((error) => Alert.alert("Export failed", error.message))} className="min-h-12 items-center justify-center rounded-2xl border border-border"><Text className="font-bold text-foreground">Export and share my data</Text></Pressable></Section>
    <Section icon={Trash2} title="Delete account"><Text className="leading-5 text-muted-foreground">Deletion has a 30-day recovery window. Sessions are revoked and the profile is hidden immediately.</Text><Pressable onPress={deleteAccount} className="min-h-12 items-center justify-center rounded-2xl bg-destructive/10"><Text className="font-bold text-destructive">Schedule deletion</Text></Pressable></Section>
  </Screen>;
}

function Section({ icon: Icon, title, children }: { icon: typeof Shield; title: string; children: React.ReactNode }) { return <View className="gap-3 rounded-3xl border border-border bg-card p-5"><View className="flex-row items-center gap-3"><Icon color="#ed4b4b" size={20} /><Text className="text-lg font-bold text-foreground">{title}</Text></View>{children}</View>; }
function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <View className="min-h-12 flex-row items-center justify-between"><Text className="flex-1 text-foreground">{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ true: "#ed4b4b" }} /></View>; }
