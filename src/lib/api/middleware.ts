import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Standard API response types
export interface ApiSuccess<T> {
    data: T;
    error?: never;
}

export interface ApiError {
    data?: never;
    error: string;
    code?: string;
    details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Helper to create JSON responses
export function json<T>(data: T, status = 200): NextResponse {
    return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400, code?: string): NextResponse {
    return NextResponse.json({ error: message, code }, { status });
}

export async function updateSession(): Promise<
    | { user: { id: string; email?: string }; error?: never }
    | { user?: never; error: NextResponse }
> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return {
            error: errorResponse('Unauthorized', 401, 'AUTH_REQUIRED'),
        };
    }
    return { user: { id: user.id, email: user.email } };
}

// Get authenticated user or return error response
export async function getAuthenticatedUser(): Promise<
    | { user: { id: string; email?: string }; error?: never }
    | { user?: never; error: NextResponse }
> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return {
            error: errorResponse('Unauthorized', 401, 'AUTH_REQUIRED'),
        };
    }

    return { user: { id: user.id, email: user.email } };
}

// Validate request body with Zod schema
export async function parseBody<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
): Promise<
    | { data: T; error?: never }
    | { data?: never; error: NextResponse }
> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            return {
                error: NextResponse.json(
                    {
                        error: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        details: result.error.flatten().fieldErrors,
                    },
                    { status: 400 }
                ),
            };
        }

        return { data: result.data };
    } catch {
        return {
            error: errorResponse('Invalid JSON body', 400, 'INVALID_JSON'),
        };
    }
}

// Combined auth + validation helper
export async function withAuthAndValidation<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
): Promise<
    | { user: { id: string; email?: string }; data: T; error?: never }
    | { user?: never; data?: never; error: NextResponse }
> {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) {
        return { error: authResult.error };
    }

    const parseResult = await parseBody(request, schema);
    if (parseResult.error) {
        return { error: parseResult.error };
    }

    return { user: authResult.user, data: parseResult.data };
}

// Error codes
export const ErrorCodes = {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    FORBIDDEN: 'FORBIDDEN',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
