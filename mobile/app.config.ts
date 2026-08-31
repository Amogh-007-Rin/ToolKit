import type { ConfigContext, ExpoConfig } from "expo/config";
import base from "./app.json";

const variants = {
  development: { name: "ToolKit Dev", suffix: ".dev" },
  staging: { name: "ToolKit Staging", suffix: ".staging" },
  production: { name: "ToolKit", suffix: "" },
} as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const variantName = process.env.APP_VARIANT ?? "development";
  const variant = variants[variantName as keyof typeof variants] ?? variants.development;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? base.expo.extra.easProjectId;
  const identifier = process.env.TOOLKIT_APP_IDENTIFIER ?? `com.example.toolkit${variant.suffix}`;
  const certificate = process.env.EXPO_UPDATES_CODE_SIGNING_CERTIFICATE;

  const updates = projectId && projectId !== "00000000-0000-0000-0000-000000000000"
    ? {
        url: `https://u.expo.dev/${projectId}`,
        checkAutomatically: "ON_LOAD" as const,
        fallbackToCacheTimeout: 0,
        ...(certificate ? {
          codeSigningCertificate: certificate,
          codeSigningMetadata: { keyid: "toolkit-staging", alg: "rsa-v1_5-sha256" as const },
        } : {}),
      }
    : { enabled: false };

  return {
    ...config,
    ...base.expo,
    name: variant.name,
    ios: { ...base.expo.ios, bundleIdentifier: identifier },
    android: { ...base.expo.android, package: identifier },
    runtimeVersion: { policy: "appVersion" },
    updates,
    extra: {
      ...base.expo.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? base.expo.extra.apiUrl,
      messageServiceUrl: process.env.EXPO_PUBLIC_MESSAGE_SERVICE_URL ?? base.expo.extra.messageServiceUrl,
      eas: { projectId },
      easProjectId: projectId,
      appVariant: variantName,
    },
  };
};
