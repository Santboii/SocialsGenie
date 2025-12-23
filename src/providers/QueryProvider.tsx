'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
    // Create a new QueryClient instance for each session
    // Using useState ensures it's stable across re-renders
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Data is fresh for 5 minutes
                        staleTime: 5 * 60 * 1000,
                        // Keep unused data in cache for 30 minutes
                        gcTime: 30 * 60 * 1000,
                        // Don't refetch on window focus in development
                        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
                        // Retry failed requests once
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
