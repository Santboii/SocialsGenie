export const queryKeys = {
    posts: ['posts'] as const,
    post: (id: string) => ['posts', id] as const,
    connections: ['connections'] as const,
    brandProfile: ['brandProfile'] as const,
    dashboardStats: ['dashboardStats'] as const,
    activities: ['activities'] as const,
    libraries: ['libraries'] as const,
    weeklySlots: ['weeklySlots'] as const,
};
