import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPosts, getPost as getPostFromDb } from '@/lib/db';
import { queryKeys } from './constants';

export function usePosts() {
    return useQuery({
        queryKey: queryKeys.posts,
        queryFn: async () => {
            return await getPosts();
        },
        staleTime: 1000 * 60 * 1, // 1 minute
    });
}

export function usePost(id: string) {
    return useQuery({
        queryKey: queryKeys.post(id),
        queryFn: async () => {
            const post = await getPostFromDb(id);
            if (!post) throw new Error('Post not found');
            return post;
        },
        enabled: !!id,
    });
}

export function useInvalidatePosts() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.posts });
}
