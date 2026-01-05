'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light'); // Default to light
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    // Load saved theme on mount
    useEffect(() => {
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setThemeState(saved);
        }
    }, []);

    // Apply theme to document
    useEffect(() => {
        const root = document.documentElement;

        let effectiveTheme: 'light' | 'dark';

        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
            effectiveTheme = theme;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResolvedTheme(effectiveTheme);
        root.setAttribute('data-theme', effectiveTheme);

        // Store in localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Listen for system theme changes
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            setResolvedTheme(e.matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
