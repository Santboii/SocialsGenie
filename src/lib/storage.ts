'use client';

import { Post, UserSettings, Activity, Suggestion, generateId, PlatformId, PLATFORMS, Platform } from '@/types';

// Re-export types for convenience
export { PLATFORMS, type Post, type Platform, type PlatformId, type Activity, type UserSettings, type DashboardStats, type Suggestion } from '@/types';

const STORAGE_KEYS = {
    posts: 'smc_posts',
    settings: 'smc_settings',
    activities: 'smc_activities',
    platforms: 'smc_platforms',
    suggestions: 'smc_suggestions',
};

// Posts
export function getPosts(): Post[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.posts);
    return data ? JSON.parse(data) : [];
}

export function getPost(id: string): Post | undefined {
    return getPosts().find(p => p.id === id);
}

export function savePosts(posts: Post[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(posts));
}

export function createPost(content: string, platforms: PlatformId[], status: 'draft' | 'scheduled' = 'draft', scheduledAt?: string): Post {
    const now = new Date().toISOString();
    const post: Post = {
        id: generateId(),
        content,
        platforms,
        status,
        scheduledAt,
        createdAt: now,
        updatedAt: now,
    };

    const posts = getPosts();
    posts.unshift(post);
    savePosts(posts);

    // Add activity
    addActivity({
        type: status === 'scheduled' ? 'scheduled' : 'drafted',
        message: `${status === 'scheduled' ? 'Scheduled' : 'Created draft'} post for ${platforms.length} platform${platforms.length > 1 ? 's' : ''}`,
        postId: post.id,
    });

    return post;
}

export function updatePost(id: string, updates: Partial<Post>): Post | undefined {
    const posts = getPosts();
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    posts[index] = {
        ...posts[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    savePosts(posts);
    return posts[index];
}

export function deletePost(id: string): boolean {
    const posts = getPosts();
    const filtered = posts.filter(p => p.id !== id);
    if (filtered.length === posts.length) return false;
    savePosts(filtered);
    return true;
}

export function publishPost(id: string): Post | undefined {
    const post = updatePost(id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
    });

    if (post) {
        addActivity({
            type: 'published',
            message: `Published post to ${post.platforms.length} platform${post.platforms.length > 1 ? 's' : ''}`,
            postId: post.id,
        });
    }

    return post;
}

// Settings
export function getSettings(): UserSettings {
    if (typeof window === 'undefined') {
        return {
            theme: 'dark',
            defaultPlatforms: ['twitter'],
            timezone: 'America/Chicago',
        };
    }

    const data = localStorage.getItem(STORAGE_KEYS.settings);
    return data ? JSON.parse(data) : {
        theme: 'dark',
        defaultPlatforms: ['twitter'],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
}

export function saveSettings(settings: UserSettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

// Activities
export function getActivities(): Activity[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.activities);
    return data ? JSON.parse(data) : [];
}

export function addActivity(activity: Omit<Activity, 'id' | 'timestamp'>): Activity {
    const newActivity: Activity = {
        ...activity,
        id: generateId(),
        timestamp: new Date().toISOString(),
    };

    const activities = getActivities();
    activities.unshift(newActivity);

    // Keep only last 50 activities
    const trimmed = activities.slice(0, 50);

    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(trimmed));
    }

    return newActivity;
}

// Platforms (connection status)
export function getConnectedPlatforms(): Platform[] {
    if (typeof window === 'undefined') return PLATFORMS;
    const data = localStorage.getItem(STORAGE_KEYS.platforms);
    return data ? JSON.parse(data) : PLATFORMS;
}

export function updatePlatformConnection(platformId: PlatformId, connected: boolean, username?: string): void {
    const platforms = getConnectedPlatforms();
    const index = platforms.findIndex(p => p.id === platformId);
    if (index !== -1) {
        platforms[index] = {
            ...platforms[index],
            connected,
            username: connected ? username : undefined,
        };
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.platforms, JSON.stringify(platforms));
        }
    }
}

// Stats
export function getDashboardStats() {
    const posts = getPosts();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
        postsThisWeek: posts.filter(p => new Date(p.createdAt) >= weekAgo).length,
        scheduledPosts: posts.filter(p => p.status === 'scheduled').length,
        drafts: posts.filter(p => p.status === 'draft').length,
        publishedThisMonth: posts.filter(p =>
            p.status === 'published' &&
            p.publishedAt &&
            new Date(p.publishedAt) >= monthAgo
        ).length,
    };
}

// Suggestions
export function getSuggestions(): Suggestion[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.suggestions);
    return data ? JSON.parse(data) : [];
}

export function saveSuggestions(suggestions: Suggestion[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.suggestions, JSON.stringify(suggestions));
}

export function addSuggestion(suggestion: Suggestion): void {
    const suggestions = getSuggestions();
    suggestions.unshift(suggestion);
    saveSuggestions(suggestions);
}

export function updateSuggestion(id: string, updates: Partial<Suggestion>): Suggestion | undefined {
    const suggestions = getSuggestions();
    const index = suggestions.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    suggestions[index] = { ...suggestions[index], ...updates };
    saveSuggestions(suggestions);
    return suggestions[index];
}

export function deleteSuggestion(id: string): boolean {
    const suggestions = getSuggestions();
    const filtered = suggestions.filter(s => s.id !== id);
    if (filtered.length === suggestions.length) return false;
    saveSuggestions(filtered);
    return true;
}

export function getPendingSuggestionsCount(): number {
    return getSuggestions().filter(s => s.status === 'pending').length;
}

// Demo data initialization
export function initDemoData(): void {
    if (typeof window === 'undefined') return;

    // Only initialize if no posts exist
    if (getPosts().length > 0) return;

    const demoPlatforms = getConnectedPlatforms().map(p => ({
        ...p,
        connected: true,
        username: p.id === 'twitter' ? '@demo_user' : 'demo_user',
    }));
    localStorage.setItem(STORAGE_KEYS.platforms, JSON.stringify(demoPlatforms));

    // Create some demo posts
    const demoContent = [
        {
            content: "🚀 Excited to announce our new product launch! Stay tuned for more updates. #innovation #tech",
            platforms: ['twitter', 'linkedin'] as PlatformId[],
            status: 'published' as const,
        },
        {
            content: "Behind the scenes at our creative studio today. The team is working on something special! ✨",
            platforms: ['instagram', 'facebook'] as PlatformId[],
            status: 'scheduled' as const,
        },
        {
            content: "Quick tip: Always proofread your content before posting. A small typo can make a big difference!",
            platforms: ['twitter', 'threads'] as PlatformId[],
            status: 'draft' as const,
        },
    ];

    demoContent.forEach((demo, index) => {
        const now = new Date();
        const createdAt = new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000).toISOString();
        const post: Post = {
            id: generateId(),
            content: demo.content,
            platforms: demo.platforms,
            status: demo.status,
            createdAt,
            updatedAt: createdAt,
            publishedAt: demo.status === 'published' ? createdAt : undefined,
            scheduledAt: demo.status === 'scheduled' ? new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        };

        const posts = getPosts();
        posts.push(post);
        savePosts(posts);
    });
}
