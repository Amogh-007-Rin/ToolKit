import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { config } from "@/lib/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient, queryPersister } from "@/lib/query";

const REFRESH_TOKEN_KEY = "toolkit.refresh-token";
const CACHE_USER_KEY = "toolkit.query-cache-user";

async function prepareCacheForUser(userId: string | null) {
  const previous = await AsyncStorage.getItem(CACHE_USER_KEY);
  if (previous && previous !== userId) {
    queryClient.clear();
    await queryPersister.removeClient();
  }
  if (userId) await AsyncStorage.setItem(CACHE_USER_KEY, userId);
  else await AsyncStorage.removeItem(CACHE_USER_KEY);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  tag: string | null;
}

interface SessionState {
  status: "loading" | "authenticated" | "anonymous";
  accessToken: string | null;
  user: SessionUser | null;
  restore: () => Promise<void>;
  refreshAccess: () => Promise<boolean>;
  setSession: (accessToken: string, refreshToken: string, user: SessionUser) => Promise<void>;
  clear: (allDevices?: boolean) => Promise<void>;
}

export interface NativeAuthPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
}

let refreshInFlight: Promise<NativeAuthPayload | null> | null = null;

async function refreshSession(): Promise<NativeAuthPayload | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    const response = await fetch(`${config.apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    return response.json() as Promise<NativeAuthPayload>;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  accessToken: null,
  user: null,
  restore: async () => {
    try {
      const payload = await refreshSession();
      if (!payload) throw new Error("refresh rejected");
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, payload.refreshToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      await prepareCacheForUser(payload.user.id);
      set({ status: "authenticated", accessToken: payload.accessToken, user: payload.user });
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await prepareCacheForUser(null);
      set({ status: "anonymous", accessToken: null, user: null });
    }
  },
  refreshAccess: async () => {
    try {
      const payload = await refreshSession();
      if (!payload) throw new Error("refresh rejected");
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, payload.refreshToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      await prepareCacheForUser(payload.user.id);
      set({ status: "authenticated", accessToken: payload.accessToken, user: payload.user });
      return true;
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await prepareCacheForUser(null);
      set({ status: "anonymous", accessToken: null, user: null });
      return false;
    }
  },
  setSession: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await prepareCacheForUser(user.id);
    set({ status: "authenticated", accessToken, user });
  },
  clear: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await fetch(`${config.apiUrl}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await prepareCacheForUser(null);
    set({ status: "anonymous", accessToken: null, user: null });
  },
}));
