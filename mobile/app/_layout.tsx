import "@/styles/global.css";
import { Stack } from "expo-router";
import type { ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View } from "react-native";
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

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <View className="flex-1 items-center justify-center gap-4 bg-background px-8"><Text accessibilityRole="header" className="text-center text-2xl font-bold text-foreground">ToolKit could not open this screen</Text><Text accessibilityRole="alert" className="text-center text-muted-foreground">{__DEV__ ? error.message : "Please retry. If the problem continues, check that the development API is running."}</Text><Pressable accessibilityRole="button" onPress={retry} className="min-h-12 min-w-40 items-center justify-center rounded-2xl bg-primary px-6"><Text className="font-bold text-white">Retry</Text></Pressable></View>;
}
