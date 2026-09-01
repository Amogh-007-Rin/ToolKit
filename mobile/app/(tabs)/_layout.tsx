import { Redirect, Tabs } from "expo-router";
import { Bot, Compass, House, LayoutGrid, MessageCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform, useColorScheme, useWindowDimensions } from "react-native";
import { useSessionStore } from "@/store/session";
import { usePreferences } from "@/store/preferences";
import { en } from "@/i18n/en";

const tabs = [
  { name: "index", title: en.navigation.overview, icon: House },
  { name: "tools", title: en.navigation.tools, icon: LayoutGrid },
  { name: "ai", title: en.navigation.ai, icon: Bot },
  { name: "messages", title: en.navigation.messages, icon: MessageCircle },
  { name: "explore", title: en.navigation.explore, icon: Compass },
] as const;

export default function TabLayout() {
  const status = useSessionStore((state) => state.status);
  const { width } = useWindowDimensions();
  const systemScheme = useColorScheme();
  const { theme, reduceMotion, highContrast } = usePreferences();
  const isTablet = width >= 768;
  const dark = theme === "dark" || (theme === "system" && systemScheme === "dark");
  if (status !== "authenticated") return <Redirect href="/auth" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isTablet ? "left" : "bottom",
        tabBarActiveTintColor: "#ed4b4b",
        tabBarInactiveTintColor: highContrast ? (dark ? "#ffffff" : "#17151f") : "#6f6a87",
        tabBarStyle: isTablet
          ? { width: 80, margin: 12, borderRadius: 24, paddingHorizontal: 8, paddingVertical: 12, borderWidth: 1, borderColor: dark ? "#2a2a2a" : "#e4e2df", backgroundColor: dark ? "#1d1d1d" : "#ffffff" }
          : { position: "absolute", left: 8, right: 8, bottom: 8, height: Platform.OS === "ios" ? 78 : 64, paddingTop: 7, paddingBottom: Platform.OS === "ios" ? 18 : 7, borderRadius: 24, borderTopWidth: 1, borderWidth: 1, borderColor: dark ? "#2a2a2a" : "#e4e2df", backgroundColor: dark ? "#1d1d1d" : "#ffffff", shadowColor: "#000", shadowOpacity: dark ? 0.35 : 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      {tabs.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          listeners={{ tabPress: () => { if (!reduceMotion) void Haptics.selectionAsync(); } }}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} strokeWidth={2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
