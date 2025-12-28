import { PlatformId, PostStatus, MediaAttachment } from './app';

export interface Post {
    id: string;
    content: string;
    platforms: PlatformId[];
    status: PostStatus;
    scheduledAt?: string;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
    media?: MediaAttachment[];
    platformContent?: Record<PlatformId, string>;
    // Evergreen / Recycling
    libraryId?: string;
    isEvergreen?: boolean;
    lastPublishedAt?: string;
}

export interface ContentLibrary {
    id: string;
    user_id: string;
    name: string;
    color: string;
    is_paused: boolean;
    auto_remix: boolean;
    generate_images?: boolean; // New field
    created_at: string;
}

export interface WeeklySlot {
    id: string;
    user_id: string;
    library_id: string;
    day_of_week: number; // 0-6
    time_of_day: string; // "09:00:00"
    platform_ids: PlatformId[];
    created_at: string;
}

// User/Settings types
export interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    defaultPlatforms: PlatformId[];
    timezone: string;
}

export interface BrandProfile {
    id: string;
    user_id: string;
    brand_name: string;
    audience: string;
    tone: string;
    examples: string[];
    created_at: string;
    updated_at: string;
}
