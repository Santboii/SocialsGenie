import { NextResponse } from 'next/server';
import { getTikTokAuthUrl, generateState } from '@/lib/social/tiktok';

/**
 * Initiates TikTok OAuth 2.0 authorization flow
 * GET /api/auth/tiktok
 */
export async function GET() {
    try {
        const state = generateState();

        // Build redirect URI
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

        // Generate authorization URL
        const authUrl = getTikTokAuthUrl(redirectUri, state);

        const response = NextResponse.redirect(authUrl);

        // Set state cookie
        response.cookies.set('tiktok_auth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        });

        // Set state cookie in request (for middleware/debugging if needed)
        // Note: next/headers cookies().set() is response-only in route handlers effectively

        return response;
    } catch (error) {
        console.error('TikTok OAuth initiation error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?error=Failed to start TikTok authorization`
        );
    }
}
