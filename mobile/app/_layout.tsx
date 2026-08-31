import "@/styles/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
        <Stack.Screen name="profile" />
        <Stack.Screen name="user/[tag]" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="support" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="conversation/[id]" />
        <Stack.Screen name="collection/[id]" />
        <Stack.Screen name="account" />
        <Stack.Screen name="offline-queue" />
        <Stack.Screen name="new-post" options={{ presentation: "modal" }} />
        <Stack.Screen name="post/[id]" />
      </Stack>
    </AppProviders>
  );
}
