import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { config } from "@/lib/config";
import { useSessionStore } from "@/store/session";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_TOKEN_KEY = "toolkit.push-token";

async function deviceRequest(method: "POST" | "DELETE", token: string) {
  const accessToken = useSessionStore.getState().accessToken;
  const response = await fetch(`${config.apiUrl}/devices${method === "DELETE" ? `?token=${encodeURIComponent(token)}` : ""}`, {
    method, headers: { Authorization: `Bearer ${accessToken}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
    body: method === "POST" ? JSON.stringify({ expoToken: token, platform: Platform.OS, appVersion: Application.nativeApplicationVersion ?? "development", locale: Intl.DateTimeFormat().resolvedOptions().locale }) : undefined,
  });
  if (!response.ok) throw new Error("Could not update push registration");
}

export async function enablePushNotifications() {
  if (!Device.isDevice) throw new Error("Push notifications require a physical device");
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "ToolKit", importance: Notifications.AndroidImportance.DEFAULT });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Notification permission was not granted. You can enable it in system settings.");
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.easProjectId;
  if (!projectId) throw new Error("EAS project ID is not configured");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await deviceRequest("POST", token);
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  return token;
}

export async function disablePushNotifications() { const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY); if (token) await deviceRequest("DELETE", token); await AsyncStorage.removeItem(PUSH_TOKEN_KEY); }
