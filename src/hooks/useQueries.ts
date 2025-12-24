import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';
import { Post, PlatformId } from '@/types';
import { getPosts, getPost as getPostFromDb } from '@/lib/db';

// Query Keys - centralized for consistency
export const queryKeys = {
    posts: ['posts'] as const,
    post: (id: string) => ['posts', id] as const,
    connections: ['connections'] as const,
    brandProfile: ['brandProfile'] as const,
    dashboardStats: ['dashboardStats'] as const,
    activities: ['activities'] as const,
};

// ============ POSTS ============

export function usePosts() {
    return useQuery({
        queryKey: queryKeys.posts,
        queryFn: async () => {
            // Use getPosts from db.ts which properly maps fields and includes platforms
            return await getPosts();
        },
    });
}

export function usePost(id: string) {
    return useQuery({
        queryKey: queryKeys.post(id),
        queryFn: async () => {
            // Use getPost from db.ts which properly maps fields and includes platforms
            const post = await getPostFromDb(id);
            if (!post) throw new Error('Post not found');
            return post;
        },
        enabled: !!id,
    });
}

// ============ CONNECTIONS ============

interface ConnectedAccount {
    platform: PlatformId;
    platform_username: string | null;
    connected_at: string;
}

export function useConnections() {
    return useQuery({
        queryKey: queryKeys.connections,
        queryFn: async () => {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('connected_accounts')
                .select('platform, platform_username, connected_at');

            if (error) throw error;
            return (data || []) as ConnectedAccount[];
        },
    });
}

// ============ BRAND PROFILE ============

export function useBrandProfile() {
    return useQuery({
        queryKey: queryKeys.brandProfile,
        queryFn: async () => {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('brand_profiles')
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
            return data;
        },
    });
}

// ============ DASHBOARD ============

interface DashboardStats {
    totalPosts: number;
    scheduledPosts: number;
    publishedPosts: number;
    draftPosts: number;
}

interface Activity {
    id: string;
    type: string;
    description: string;
    created_at: string;
}

export function useDashboardStats() {
    return useQuery({
        queryKey: queryKeys.dashboardStats,
        queryFn: async () => {
            const supabase = getSupabase();
            const { data: posts, error } = await supabase
                .from('posts')
                .select('status');

            if (error) throw error;

            const stats: DashboardStats = {
                totalPosts: posts?.length || 0,
                scheduledPosts: posts?.filter(p => p.status === 'scheduled').length || 0,
                publishedPosts: posts?.filter(p => p.status === 'published').length || 0,
                draftPosts: posts?.filter(p => p.status === 'draft').length || 0,
            };

            return stats;
        },
    });
}

export function useActivities() {
    return useQuery({
        queryKey: queryKeys.activities,
        queryFn: async () => {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('activities')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error && error.code !== 'PGRST116') throw error;
            return (data || []) as Activity[];
        },
    });
}

// ============ CACHE INVALIDATION ============

export function useInvalidatePosts() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.posts });
}

export function useInvalidateConnections() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.connections });
}

export function useInvalidateAll() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries();
}
