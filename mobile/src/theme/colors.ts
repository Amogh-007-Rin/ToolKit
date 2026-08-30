export const palette = {
  light: {
    background: "#f2f0ed",
    foreground: "#292d32",
    card: "#ffffff",
    muted: "#f1f0ec",
    mutedForeground: "#6f6a87",
    primary: "#ed4b4b",
    border: "#e4e2df",
  },
  dark: {
    background: "#000000",
    foreground: "#ffffff",
    card: "#1d1d1d",
    muted: "#252525",
    mutedForeground: "#a8a2b8",
    primary: "#ed4b4b",
    border: "#2a2a2a",
  },
} as const;

export type ThemeName = keyof typeof palette;
