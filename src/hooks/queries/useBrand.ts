import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';
import { queryKeys } from './constants';

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
