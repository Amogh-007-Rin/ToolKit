import { router } from "expo-router";
import { Compass, MessageCircleMore, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/BrandMark";
import { usePreferences } from "@/store/preferences";

const pages = [
  { icon: Compass, title: "Everything in one place", body: "Discover the tools creators trust and organize your own workflow into beautiful collections." },
  { icon: Sparkles, title: "Ask ToolKit AI", body: "Describe what you need and get useful, collection-ready recommendations with conversational context." },
  { icon: MessageCircleMore, title: "Share and connect", body: "Follow creators, publish your stack, and chat in real time without leaving ToolKit." },
] as const;

export default function OnboardingScreen() {
  const [page, setPage] = useState(0);
  const complete = usePreferences((state) => state.completeOnboarding);
  const item = pages[page];
  const Icon = item.icon;

  const finish = () => {
    complete();
    router.replace("/auth");
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 py-5">
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
          <Text className="font-medium text-muted-foreground">Skip</Text>
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center gap-8">
        <View className="h-28 w-28 items-center justify-center rounded-[36px] bg-primary/10">
          <Icon size={48} color="#ed4b4b" strokeWidth={1.8} />
        </View>
        <View className="max-w-sm items-center gap-3">
          <Text className="text-center text-3xl font-bold tracking-tight text-foreground">{item.title}</Text>
          <Text className="text-center text-base leading-6 text-muted-foreground">{item.body}</Text>
        </View>
      </View>
      <View className="gap-5">
        <View className="flex-row justify-center gap-2">
          {pages.map((_, index) => (
            <View key={index} className={`h-2 rounded-full ${index === page ? "w-7 bg-primary" : "w-2 bg-border"}`} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => (page === pages.length - 1 ? finish() : setPage((value) => value + 1))}
          className="h-14 items-center justify-center rounded-2xl bg-primary active:opacity-80"
        >
          <Text className="text-base font-bold text-white">{page === pages.length - 1 ? "Get started" : "Continue"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
