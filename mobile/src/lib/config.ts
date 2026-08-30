import Constants from "expo-constants";

interface ToolKitExtra {
  apiUrl?: string;
  messageServiceUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ToolKitExtra;
const apiV1Url = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "http://127.0.0.1:3000/api/v1";
const serverUrl = apiV1Url.replace(/\/api\/v1\/?$/, "");

export const config = {
  serverUrl,
  apiUrl: apiV1Url,
  webApiUrl: `${serverUrl}/api`,
  messageServiceUrl:
    process.env.EXPO_PUBLIC_MESSAGE_SERVICE_URL ??
    extra.messageServiceUrl ??
    "http://127.0.0.1:8080",
} as const;
