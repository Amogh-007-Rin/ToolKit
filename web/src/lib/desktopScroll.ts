export const DESKTOP_SCROLL_QUERY = "(min-width: 1024px)";

export function isDesktopScroll(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_SCROLL_QUERY).matches;
}
