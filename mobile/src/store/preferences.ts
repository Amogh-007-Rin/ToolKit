import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";

interface PreferencesState {
  onboardingComplete: boolean;
  theme: ThemePreference;
  reduceMotion: boolean;
  highContrast: boolean;
  biometricLock: boolean;
  completeOnboarding: () => void;
  setTheme: (theme: ThemePreference) => void;
  setReduceMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setBiometricLock: (enabled: boolean) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      theme: "system",
      reduceMotion: false,
      highContrast: false,
      biometricLock: false,
      completeOnboarding: () => set({ onboardingComplete: true }),
      setTheme: (theme) => set({ theme }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setBiometricLock: (biometricLock) => set({ biometricLock }),
    }),
    {
      name: "toolkit-preferences",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ onboardingComplete, theme, reduceMotion, highContrast, biometricLock }) => ({
        onboardingComplete,
        theme,
        reduceMotion,
        highContrast,
        biometricLock,
      }),
    },
  ),
);
