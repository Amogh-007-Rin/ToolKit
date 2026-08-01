'use client'

import type { ComponentProps, ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children, ...props }: { children: ReactNode } & ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider {...props}>
            {children}
        </NextThemesProvider>
    );
};
