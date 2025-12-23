import { z } from 'zod';

// Platform ID enum
export const platformIdSchema = z.enum(['twitter', 'instagram', 'linkedin', 'facebook', 'threads']);
export type PlatformIdSchema = z.infer<typeof platformIdSchema>;

// Post status enum
export const postStatusSchema = z.enum(['draft', 'scheduled', 'published', 'failed']);
export type PostStatusSchema = z.infer<typeof postStatusSchema>;

// Media attachment schema
export const mediaAttachmentSchema = z.object({
    id: z.string(),
    type: z.enum(['image', 'video']),
    url: z.string().url(),
    thumbnail: z.string().url().optional(),
    altText: z.string().optional(),
});

// Create post input schema
export const createPostSchema = z.object({
    content: z.string().min(1, 'Content is required').max(10000),
    platforms: z.array(platformIdSchema).min(1, 'At least one platform is required'),
    status: z.enum(['draft', 'scheduled']).default('draft'),
    scheduledAt: z.string().datetime().optional().nullable(),
    platformContent: z.record(platformIdSchema, z.string()).optional(),
    media: z.array(mediaAttachmentSchema).optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

// Update post input schema
export const updatePostSchema = z.object({
    content: z.string().min(1).max(10000).optional(),
    status: postStatusSchema.optional(),
    scheduledAt: z.string().datetime().optional().nullable(),
    publishedAt: z.string().datetime().optional(),
    platforms: z.array(platformIdSchema).min(1).optional(),
    platformContent: z.record(platformIdSchema, z.string()).optional(),
    media: z.array(mediaAttachmentSchema).optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// Brand profile schema
export const brandProfileSchema = z.object({
    brand_name: z.string().min(1).max(100),
    audience: z.string().max(500).optional(),
    tone: z.string().max(100).optional(),
    examples: z.array(z.string()).optional(),
});
export type BrandProfileInput = z.infer<typeof brandProfileSchema>;

// AI generation request schema
export const aiGenerateSchema = z.object({
    prompt: z.string().min(1).max(1000),
    platforms: z.array(platformIdSchema).min(1),
    tone: z.enum(['casual', 'professional', 'promotional']).optional(),
});
export type AIGenerateInput = z.infer<typeof aiGenerateSchema>;

// Helper to validate and parse
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
}

// Helper for API routes - returns result or error response
export function validateRequest<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error.issues };
}
