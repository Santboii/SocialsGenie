import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './constants';

export function useWeeklySlots() {
    return useQuery({
        queryKey: queryKeys.weeklySlots,
        queryFn: async () => {
            const res = await fetch('/api/schedule/slots');
            if (!res.ok) throw new Error('Failed to fetch slots');
            return res.json() as Promise<any[]>;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false, // Prevent overwriting optimistic state on focus
    });
}
