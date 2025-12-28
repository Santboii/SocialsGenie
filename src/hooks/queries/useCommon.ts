import { useQueryClient } from '@tanstack/react-query';

export function useInvalidateAll() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries();
}
