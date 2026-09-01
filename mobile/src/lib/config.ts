import Constants from "expo-constants";
import { Platform } from "react-native";


interface ToolKitExtra {
  apiUrl?: string;
  messageServiceUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ToolKitExtra;
const developmentHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl;
const configuredMessageUrl = process.env.EXPO_PUBLIC_MESSAGE_SERVICE_URL ?? extra.messageServiceUrl;
const normalizeDevelopmentHost = (value: string) => __DEV__ && Platform.OS === "android"
  ? value.replace("127.0.0.1", developmentHost).replace("localhost", developmentHost)
  : value;
const apiV1Url = normalizeDevelopmentHost(configuredApiUrl ?? `http://${developmentHost}:3000/api/v1`);
const serverUrl = apiV1Url.replace(/\/api\/v1\/?$/, "");
const apiHost = new URL(apiV1Url).hostname;
const messageUrl = configuredMessageUrl ?? `http://${developmentHost}:8080`;
const alignedMessageUrl = !["127.0.0.1", "localhost", "10.0.2.2"].includes(apiHost)
  ? messageUrl.replace("127.0.0.1", apiHost).replace("localhost", apiHost).replace("10.0.2.2", apiHost)
  : messageUrl;

export const config = {
  serverUrl,
  apiUrl: apiV1Url,
  webApiUrl: `${serverUrl}/api`,
  messageServiceUrl:
    normalizeDevelopmentHost(alignedMessageUrl),
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "",
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "",
  glitchtipDsn: process.env.EXPO_PUBLIC_GLITCHTIP_DSN ?? "",
} as const;
