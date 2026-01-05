import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './constants';
import { PlatformId } from '@/types';

export interface WeeklyScheduleSlot {
    id: string;
    user_id: string;
    library_id: string;
    day_of_week: number;
    time_of_day: string;
    platform_ids: PlatformId[];
    created_at?: string;
    content_libraries?: {
        name: string;
        color: string;
        platforms: PlatformId[];
    };
}

export function useWeeklySlots() {
    return useQuery({
        queryKey: queryKeys.weeklySlots,
        queryFn: async () => {
            const res = await fetch('/api/schedule/slots');
            if (!res.ok) throw new Error('Failed to fetch slots');
            return res.json() as Promise<WeeklyScheduleSlot[]>;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false, // Prevent overwriting optimistic state on focus
    });
}
