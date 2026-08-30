import { PropsWithChildren, ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
}

export function Screen({ title, subtitle, action, scroll = true, children }: ScreenProps) {
  const content = (
    <View className="gap-5 px-5 pb-28 pt-3">
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-3xl font-bold tracking-tight text-foreground">{title}</Text>
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
        <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
