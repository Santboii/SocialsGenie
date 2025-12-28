import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './constants';
import { ContentLibrary } from '@/types';

export function useLibraries() {
    return useQuery({
        queryKey: queryKeys.libraries,
        queryFn: async () => {
            const res = await fetch('/api/libraries');
            if (!res.ok) throw new Error('Failed to fetch libraries');
            return res.json() as Promise<ContentLibrary[]>;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useContentLibraries() {
    return useLibraries();
}
