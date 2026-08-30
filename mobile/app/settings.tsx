import { router } from "expo-router";
import { Accessibility, ChevronRight, LogOut, Palette, ShieldCheck } from "lucide-react-native";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { en } from "@/i18n/en";
import { ThemePreference, usePreferences } from "@/store/preferences";
import { useSessionStore } from "@/store/session";
import { getNotificationPreferences, NotificationPreferences, updateNotificationPreferences } from "@/services/product";
import { disablePushNotifications, enablePushNotifications } from "@/services/push";

export default function SettingsScreen() {
  const { theme, reduceMotion, highContrast, biometricLock, setTheme, setReduceMotion, setHighContrast, setBiometricLock } = usePreferences();
  const clear = useSessionStore((state) => state.clear);
  const client = useQueryClient();
  const notifications = useQuery({ queryKey: ["notification-preferences"], queryFn: getNotificationPreferences });
  const updateNotifications = useMutation({ mutationFn: (value: Partial<NotificationPreferences>) => updateNotificationPreferences(value), onSuccess: () => void client.invalidateQueries({ queryKey: ["notification-preferences"] }) });

  const signOut = () => Alert.alert("Sign out?", "This device will need to sign in again.", [
    { text: en.common.cancel, style: "cancel" },
    { text: "Sign out", style: "destructive", onPress: () => void clear().then(() => router.replace("/auth")) },
  ]);
  const changeBiometricLock = async (enabled: boolean) => {
    if (!enabled) return setBiometricLock(false);
    const supported = await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync();
    if (!supported) return Alert.alert("Device lock unavailable", "Set up biometrics or a device passcode in system settings first.");
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Enable ToolKit lock", disableDeviceFallback: false });
    if (result.success) setBiometricLock(true);
  };
  const changePush = async (enabled: boolean) => {
    try {
      if (enabled) await enablePushNotifications(); else await disablePushNotifications();
      updateNotifications.mutate({ pushEnabled: enabled });
    } catch (cause) {
      Alert.alert("Notifications unavailable", cause instanceof Error ? cause.message : "Could not update notifications");
    }
  };

  return (
    <Screen title={en.settings.title} subtitle={en.settings.subtitle}>
      <Section icon={Palette} title={en.settings.appearance}>
        <View className="flex-row gap-2">
          {(["system", "light", "dark"] as ThemePreference[]).map((value) => (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: theme === value }} key={value} onPress={() => setTheme(value)} className={`min-h-12 flex-1 items-center justify-center rounded-2xl border ${theme === value ? "border-primary bg-primary/10" : "border-border bg-input"}`}>
              <Text className={theme === value ? "font-semibold text-primary" : "font-semibold text-foreground"}>{en.settings[value]}</Text>
            </Pressable>
          ))}
        </View>
      </Section>
      <Section icon={Accessibility} title="Accessibility">
        <SettingToggle label={en.settings.highContrast} value={highContrast} onChange={setHighContrast} />
        <SettingToggle label={en.settings.reducedMotion} value={reduceMotion} onChange={setReduceMotion} />
      </Section>
      <Section icon={Bell} title="Notifications">
        <SettingToggle label="Push notifications" value={notifications.data?.preferences.pushEnabled ?? false} onChange={(pushEnabled) => void changePush(pushEnabled)} />
        <SettingToggle label="Message notifications" value={notifications.data?.preferences.notifyMessages ?? false} onChange={(notifyMessages) => updateNotifications.mutate({ notifyMessages })} />
        <SettingToggle label="Social notifications" value={notifications.data?.preferences.notifySocial ?? false} onChange={(notifySocial) => updateNotifications.mutate({ notifySocial })} />
        <SettingToggle label="Show detailed previews" value={notifications.data?.preferences.pushPreview ?? false} onChange={(pushPreview) => updateNotifications.mutate({ pushPreview })} />
      </Section>
      <Section icon={LogOut} title={en.settings.security}>
        <SettingToggle label="Biometric and device lock" value={biometricLock} onChange={(value) => void changeBiometricLock(value)} />
        <Pressable accessibilityRole="button" onPress={signOut} className="min-h-12 items-center justify-center rounded-2xl bg-destructive/10 px-4">
          <Text className="font-bold text-destructive">{en.settings.signOut}</Text>
        </Pressable>
      </Section>
      <Pressable onPress={() => router.push("/account")} className="min-h-16 flex-row items-center gap-3 rounded-3xl border border-border bg-card px-5"><ShieldCheck color="#ed4b4b" size={21} /><Text className="flex-1 text-base font-bold text-foreground">Account, privacy, sessions, and data</Text><ChevronRight color="#6f6a87" size={20} /></Pressable>
    </Screen>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Palette; title: string; children: React.ReactNode }) {
  return <View className="gap-4 rounded-3xl border border-border bg-card p-5"><View className="flex-row items-center gap-3"><Icon color="#ed4b4b" size={21} /><Text className="text-lg font-bold text-foreground">{title}</Text></View>{children}</View>;
}

function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View className="min-h-12 flex-row items-center justify-between gap-4"><Text className="flex-1 text-base text-foreground">{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: "#ed4b4b" }} /></View>;
}
