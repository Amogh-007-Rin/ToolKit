import Constants from "expo-constants";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

export function getNotificationsModule(): NotificationsModule | null {
  // Importing expo-notifications itself throws on Android in Expo Go since SDK 53.
  // Native development and production builds still load the full module.
  if (Platform.OS === "android" && Constants.appOwnership === "expo") return null;
  return require("expo-notifications") as NotificationsModule;
}
