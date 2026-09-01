import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "@/lib/api";
import { getNotificationsModule } from "@/lib/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OperationResult } from "@/generated/contract-types";

const PUSH_TOKEN_KEY = "toolkit.push-token";

async function deviceRequest(method: "POST" | "DELETE", token: string) {
  await api<OperationResult<"registerDevice" | "unregisterDevice">>(`/devices${method === "DELETE" ? `?token=${encodeURIComponent(token)}` : ""}`, {
    method,
    body: method === "POST" ? JSON.stringify({ expoToken: token, platform: Platform.OS, appVersion: Application.nativeApplicationVersion ?? "development", locale: Intl.DateTimeFormat().resolvedOptions().locale }) : undefined,
  });
}

export async function enablePushNotifications() {
  const notifications = getNotificationsModule();
  if (!notifications) throw new Error("Push notifications require a development build and are unavailable in Expo Go on Android.");
  if (!Device.isDevice) throw new Error("Push notifications require a physical device");
  if (Platform.OS === "android") await notifications.setNotificationChannelAsync("default", { name: "ToolKit", importance: notifications.AndroidImportance.DEFAULT });
  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted) permission = await notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Notification permission was not granted. You can enable it in system settings.");
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.easProjectId;
  if (!projectId) throw new Error("EAS project ID is not configured");
  const token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
  await deviceRequest("POST", token);
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  return token;
}

export async function disablePushNotifications() { const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY); if (token) await deviceRequest("DELETE", token); await AsyncStorage.removeItem(PUSH_TOKEN_KEY); }
