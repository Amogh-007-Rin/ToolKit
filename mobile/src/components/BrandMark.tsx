import { Text, View } from "react-native";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
        <Text className="text-xl font-black text-white">T</Text>
      </View>
      {!compact ? <Text className="text-2xl font-bold tracking-tight text-foreground">ToolKit</Text> : null}
    </View>
  );
}
