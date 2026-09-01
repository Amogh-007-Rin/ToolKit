import { PropsWithChildren, ReactNode } from "react";
import { RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({ title, subtitle, action, scroll = true, refreshing = false, onRefresh, children }: ScreenProps) {
  const { width } = useWindowDimensions();
  const content = (
    <View style={{ width: "100%", maxWidth: width >= 768 ? 1040 : undefined, alignSelf: "center" }} className="gap-4 px-3 pb-28 pt-3">
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} className="text-2xl font-semibold tracking-wide text-foreground">{title}</Text>
          {subtitle ? <Text className="text-sm leading-5 text-muted-foreground">{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ed4b4b" colors={["#ed4b4b"]} /> : undefined}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
