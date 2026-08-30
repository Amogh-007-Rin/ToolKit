import { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

export function FeatureCard({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <View className="flex-row gap-4 rounded-3xl border border-border bg-card p-5">
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
        <Icon color="#ed4b4b" size={21} strokeWidth={2.2} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">{detail}</Text>
      </View>
    </View>
  );
}
