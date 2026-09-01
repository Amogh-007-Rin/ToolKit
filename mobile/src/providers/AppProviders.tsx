import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Linking, Pressable, Text, useColorScheme, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useNetworkState } from "expo-network";
import type { NotificationResponse } from "expo-notifications";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { processMutationQueue } from "@/lib/offlineQueue";
import { executeQueuedMediaMutation } from "@/services/media";
import { getNotificationsModule } from "@/lib/notifications";

const notifications = getNotificationsModule();
notifications?.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }) });
import { QUERY_CACHE_MAX_AGE, queryClient, queryPersister } from "@/lib/query";
import { usePreferences } from "@/store/preferences";
import { useSessionStore } from "@/store/session";
import { parseAppLink } from "@/lib/links";

export function AppProviders({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const preference = usePreferences((state) => state.theme);
  const restore = useSessionStore((state) => state.restore);
  const biometricLock = usePreferences((state) => state.biometricLock);
  const highContrast = usePreferences((state) => state.highContrast);
  const network = useNetworkState();
  const [locked, setLocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isDark = preference === "dark" || (preference === "system" && systemTheme === "dark");

  useEffect(() => {
    const openLink = ({ url }: { url: string }) => {
      const link = parseAppLink(url);
      if (link.kind === "profile") router.push({ pathname: "/user/[tag]", params: { tag: link.tag } });
      else if (link.kind === "post") router.push({ pathname: "/post/[id]", params: { id: link.id } });
      else if (link.kind === "conversation") router.push({ pathname: "/conversation/[id]", params: { id: link.id } });
      else if (link.kind === "notification") router.push("/notifications");
      else if (link.kind === "verifyEmail") router.push({ pathname: "/auth", params: { action: "verify", token: link.token } });
      else if (link.kind === "resetPassword") router.push({ pathname: "/auth", params: { action: "reset", token: link.token } });
      else if (link.kind === "restoreAccount") router.push({ pathname: "/auth", params: { action: "restore" } });
    };
    const subscription = Linking.addEventListener("url", openLink);
    void Linking.getInitialURL().then((url) => { if (url) openLink({ url }); });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (network.isInternetReachable) void processMutationQueue(async (item) => {
      if (item.operation === "media.post.create") return executeQueuedMediaMutation(item);
      await api(item.path, { method: item.method, body: item.body, headers: { "Idempotency-Key": item.id } });
    }, (item) => item.operation !== "message.send");
  }, [network.isInternetReachable]);

  useEffect(() => {
    if (!notifications) return;
    const open = (response: NotificationResponse) => {
      const data = response.notification.request.content.data ?? {};
      const roomId = typeof data.roomId === "string" ? data.roomId : null;
      if (roomId) router.push({ pathname: "/conversation/[id]", params: { id: roomId } });
      else router.push("/notifications");
    };
    const subscription = notifications.addNotificationResponseReceivedListener(open);
    void notifications.getLastNotificationResponseAsync().then((response) => { if (response) open(response); });
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
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: QUERY_CACHE_MAX_AGE, buster: "mobile-api-v1" }}>
      <ThemeBoundary dark={isDark} highContrast={highContrast}>{locked ? <LockScreen unlock={unlock} /> : children}</ThemeBoundary>
    </PersistQueryClientProvider>
  );
}

function LockScreen({ unlock }: { unlock: () => Promise<void> }) {
  return <View accessibilityViewIsModal className="flex-1 items-center justify-center gap-5 bg-background px-8"><Text className="text-3xl font-bold text-foreground">ToolKit is locked</Text><Text className="text-center text-muted-foreground">Authenticate with your device to continue.</Text><Pressable onPress={() => void unlock()} className="min-h-14 min-w-52 items-center justify-center rounded-2xl bg-primary px-6"><Text className="font-bold text-white">Unlock</Text></Pressable></View>;
}

function ThemeBoundary({ dark, highContrast, children }: PropsWithChildren<{ dark: boolean; highContrast: boolean }>) {
  return <View className={`${dark ? "dark" : ""} ${highContrast ? "high-contrast" : ""} flex-1`}>{children}</View>;
}
