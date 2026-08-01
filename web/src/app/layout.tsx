import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { Providers } from "@/lib/Providers";

const toolKitFont = localFont({
  src: './fonts/toolkit-font.woff2',
  variable: '--font-toolkit',
});

export const metadata: Metadata = {
  title: "ToolKit",
  description: "One Place storage for your tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${toolKitFont.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
};
