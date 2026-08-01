export function getLogoUrl(link: string): string | null {
    const trimmed = link.trim();
    if (!trimmed) return null;
    try {
        const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
    } catch {
        return null;
    }
}
