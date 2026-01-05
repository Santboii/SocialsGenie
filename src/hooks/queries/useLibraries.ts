import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './constants';
import { ContentLibrary, Post } from '@/types';

interface LibraryPost extends Post {
    post_platforms?: { platform: string }[];
}

export interface LibraryResponse {
    library: ContentLibrary;
    posts: LibraryPost[];
}

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

function fetchLibrary(id: string) {
    return async () => {
        const res = await fetch(`/api/libraries/${id}`);
        if (!res.ok) throw new Error('Failed to fetch library');
        return res.json() as Promise<LibraryResponse>;
    };
}

export function useLibrary(id: string) {
    return useQuery({
        queryKey: queryKeys.library(id),
        queryFn: fetchLibrary(id),
        select: (data) => data.library,
        enabled: !!id,
    });
}

export function useLibraryPosts(id: string) {
    return useQuery({
        queryKey: queryKeys.library(id),
        queryFn: fetchLibrary(id),
        select: (data) => data.posts,
        enabled: !!id,
    });
}
