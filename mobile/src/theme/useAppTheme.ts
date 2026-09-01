import { useColorScheme } from "react-native";
import { usePreferences } from "@/store/preferences";
import { palette } from "./colors";

export function useAppTheme() {
  const system = useColorScheme();
  const selected = usePreferences((state) => state.theme);
  const dark = selected === "dark" || (selected === "system" && system === "dark");
  return { dark, colors: dark ? palette.dark : palette.light };
}
