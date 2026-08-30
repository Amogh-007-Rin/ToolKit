import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { usePreferences } from "@/store/preferences";
import { useSessionStore } from "@/store/session";

export default function Index() {
  const onboardingComplete = usePreferences((state) => state.onboardingComplete);
  const status = useSessionStore((state) => state.status);

  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#ed4b4b" />
      </View>
    );
  }
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  if (status !== "authenticated") return <Redirect href="/auth" />;
  return <Redirect href="/(tabs)" />;
}
