import { QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Pressable, Text, useColorScheme, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useNetworkState } from "expo-network";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { processMutationQueue } from "@/lib/offlineQueue";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }) });
import { queryClient } from "@/lib/query";
import { usePreferences } from "@/store/preferences";
import { useSessionStore } from "@/store/session";

export function AppProviders({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const preference = usePreferences((state) => state.theme);
  const restore = useSessionStore((state) => state.restore);
  const biometricLock = usePreferences((state) => state.biometricLock);
  const network = useNetworkState();
  const [locked, setLocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isDark = preference === "dark" || (preference === "system" && systemTheme === "dark");

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (network.isInternetReachable) void processMutationQueue(async (item) => {
      await api(item.path, { method: item.method, body: item.body, headers: { "Idempotency-Key": item.id } });
    });
  }, [network.isInternetReachable]);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data ?? {};
      const roomId = typeof data.roomId === "string" ? data.roomId : null;
      if (roomId) router.push({ pathname: "/conversation/[id]", params: { id: roomId } });
      else router.push("/notifications");
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) open(response); });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (biometricLock && appState.current === "active" && next !== "active") setLocked(true);
      appState.current = next;
    });
    return () => subscription.remove();
  }, [biometricLock]);

  const unlock = async () => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock ToolKit", disableDeviceFallback: false });
    if (result.success) setLocked(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBoundary dark={isDark}>{locked ? <LockScreen unlock={unlock} /> : children}</ThemeBoundary>
    </QueryClientProvider>
  );
}

function LockScreen({ unlock }: { unlock: () => Promise<void> }) {
  return <View accessibilityViewIsModal className="flex-1 items-center justify-center gap-5 bg-background px-8"><Text className="text-3xl font-bold text-foreground">ToolKit is locked</Text><Text className="text-center text-muted-foreground">Authenticate with your device to continue.</Text><Pressable onPress={() => void unlock()} className="min-h-14 min-w-52 items-center justify-center rounded-2xl bg-primary px-6"><Text className="font-bold text-white">Unlock</Text></Pressable></View>;
}

function ThemeBoundary({ dark, children }: PropsWithChildren<{ dark: boolean }>) {
  return <View className={`${dark ? "dark" : ""} flex-1`}>{children}</View>;
}
