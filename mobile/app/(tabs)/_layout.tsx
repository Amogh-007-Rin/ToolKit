import { Redirect, Tabs } from "expo-router";
import { Bot, Compass, House, LayoutGrid, MessageCircle } from "lucide-react-native";
import { Platform } from "react-native";
import { useSessionStore } from "@/store/session";

const tabs = [
  { name: "index", title: "Overview", icon: House },
  { name: "tools", title: "Tools", icon: LayoutGrid },
  { name: "ai", title: "AI Search", icon: Bot },
  { name: "messages", title: "Messages", icon: MessageCircle },
  { name: "explore", title: "Explore", icon: Compass },
] as const;

export default function TabLayout() {
  const status = useSessionStore((state) => state.status);
  if (status !== "authenticated") return <Redirect href="/auth" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ed4b4b",
        tabBarInactiveTintColor: "#6f6a87",
        tabBarStyle: {
          position: "absolute",
          height: Platform.OS === "ios" ? 88 : 70,
          paddingTop: 8,
          borderTopColor: "#e4e2df",
          backgroundColor: "#ffffff",
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      {tabs.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} strokeWidth={2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
