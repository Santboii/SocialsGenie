import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';
import { PlatformId } from '@/types';
import { queryKeys } from './constants';

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

export function useInvalidateConnections() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.connections });
}
