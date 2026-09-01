import * as Haptics from "expo-haptics";
import { ComponentType, PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, Text, TextInput, TextInputProps, View } from "react-native";
import { AlertCircle, Inbox, UserRound, X } from "lucide-react-native";
import { usePreferences } from "@/store/preferences";

type ButtonVariant = "primary" | "secondary" | "destructive";

export function Button({ label, onPress, disabled, loading, variant = "primary", icon: Icon }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: ButtonVariant; icon?: ComponentType<{ color: string; size: number }> }) {
  const reduceMotion = usePreferences((state) => state.reduceMotion);
  const background = variant === "primary" ? "bg-primary" : variant === "destructive" ? "bg-destructive/10" : "border border-border bg-card";
  const color = variant === "primary" ? "white" : variant === "destructive" ? "#ed4b4b" : "#292d32";
  const text = variant === "primary" ? "text-white" : variant === "destructive" ? "text-destructive" : "text-foreground";
  const press = () => { if (!reduceMotion) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); };
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }} disabled={disabled || loading} onPress={press} className={`min-h-12 flex-row items-center justify-center gap-2 rounded-2xl px-5 disabled:opacity-50 ${background}`}>{loading ? <ActivityIndicator color={color} /> : <>{Icon ? <Icon color={color} size={18} /> : null}<Text className={`font-bold ${text}`}>{label}</Text></>}</Pressable>;
}

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <View className={`rounded-3xl border border-border bg-card p-5 ${className}`}>{children}</View>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View className="gap-2"><Text className="font-semibold text-foreground">{label}</Text><TextInput accessibilityLabel={label} accessibilityHint={error} placeholderTextColor="#6f6a87" className={`min-h-12 rounded-2xl border bg-input px-4 text-foreground ${error ? "border-destructive" : "border-border"}`} {...props} />{error ? <Text accessibilityRole="alert" className="text-sm text-destructive">{error}</Text> : null}</View>;
}

export function Avatar({ uri, name, size = 48 }: { uri?: string | null; name?: string | null; size?: number }) {
  const initials = name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join("");
  return uri ? <Image accessibilityLabel={name ? `${name}'s avatar` : "User avatar"} source={{ uri }} style={{ width: size, height: size, borderRadius: size / 3 }} /> : <View accessibilityLabel={name ? `${name}'s avatar` : "User avatar"} style={{ width: size, height: size, borderRadius: size / 3 }} className="items-center justify-center bg-primary/10">{initials ? <Text className="font-bold text-primary">{initials}</Text> : <UserRound color="#ed4b4b" size={size * 0.45} />}</View>;
}

export function Badge({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "primary" | "danger" }>) {
  const classes = tone === "primary" ? "bg-primary/10 text-primary" : tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";
  return <View className={`self-start rounded-full px-3 py-1.5 ${classes.split(" ")[0]}`}><Text className={`text-xs font-semibold ${classes.split(" ")[1]}`}>{children}</Text></View>;
}

export function Skeleton({ height = 16, width = "100%" }: { height?: number; width?: number | `${number}%` }) {
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height, width }} className="rounded-xl bg-muted" />;
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <Card className="items-center gap-3"><Inbox color="#ed4b4b" size={30} /><Text className="text-center text-lg font-bold text-foreground">{title}</Text>{detail ? <Text className="text-center leading-5 text-muted-foreground">{detail}</Text> : null}{action}</Card>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <View accessibilityRole="alert" className="gap-3 rounded-3xl bg-destructive/10 p-5"><View className="flex-row items-center gap-2"><AlertCircle color="#ed4b4b" size={20} /><Text className="flex-1 font-semibold text-destructive">{message}</Text></View>{retry ? <Button label="Retry" onPress={retry} variant="secondary" /> : null}</View>;
}

export function confirm(title: string, message: string, actionLabel: string, onConfirm: () => void) {
  Alert.alert(title, message, [{ text: "Cancel", style: "cancel" }, { text: actionLabel, style: "destructive", onPress: onConfirm }]);
}

export interface SheetAction { label: string; onPress: () => void; destructive?: boolean }
export function ActionSheet({ visible, title, actions, onClose }: { visible: boolean; title: string; actions: SheetAction[]; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable accessibilityLabel="Close menu" onPress={onClose} className="flex-1 justify-end bg-black/40"><Pressable accessibilityViewIsModal onPress={(event) => event.stopPropagation()} className="gap-3 rounded-t-[32px] bg-background p-5 pb-10"><View className="flex-row items-center justify-between"><Text className="text-xl font-bold text-foreground">{title}</Text><Pressable accessibilityLabel="Close" onPress={onClose} className="h-11 w-11 items-center justify-center rounded-2xl bg-card"><X color="#6f6a87" size={20} /></Pressable></View>{actions.map((action) => <Button key={action.label} label={action.label} variant={action.destructive ? "destructive" : "secondary"} onPress={() => { onClose(); action.onPress(); }} />)}</Pressable></Pressable></Modal>;
}
