import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';
import { queryKeys } from './constants';

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
