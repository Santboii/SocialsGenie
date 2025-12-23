import { z } from 'zod';

// Environment variable validation
const envSchema = z.object({
    // Public (available in browser)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),

    // Server-only
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    GOOGLE_API_KEY: z.string().min(1).optional(),

    // Meta/Facebook (server-only)
    FACEBOOK_CLIENT_ID: z.string().optional(),
    FACEBOOK_CLIENT_SECRET: z.string().optional(),
    META_APP_ID: z.string().optional(),
    META_APP_SECRET: z.string().optional(),
    INSTAGRAM_APP_ID: z.string().optional(),
    INSTAGRAM_APP_SECRET: z.string().optional(),
});

// Validate on import (will throw if invalid)
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parseResult.error.flatten().fieldErrors);
    // Don't throw in development, just warn
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid environment variables');
    }
}

export const env = parseResult.success ? parseResult.data : (process.env as unknown as z.infer<typeof envSchema>);

// Type-safe accessors
export function getEnv<K extends keyof z.infer<typeof envSchema>>(
    key: K
): z.infer<typeof envSchema>[K] {
    return env[key];
}

// Required env helper (throws if missing)
export function requireEnv(key: keyof z.infer<typeof envSchema>): string {
    const value = env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
