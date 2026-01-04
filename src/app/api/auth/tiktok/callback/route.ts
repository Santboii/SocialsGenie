import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
    exchangeCodeForTokens,
    getTikTokUserInfo,
} from '@/lib/social/tiktok';

/**
 * Handles TikTok OAuth 2.0 callback
 * GET /api/auth/tiktok/callback
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

    // Handle authorization errors
    if (error) {
        console.error('TikTok OAuth error:', error);
        return NextResponse.redirect(
            `${baseUrl}/settings?error=${encodeURIComponent(`TikTok authorization failed: ${error}`)}`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${baseUrl}/settings?error=${encodeURIComponent('Missing authorization code or state')}`
        );
    }

    try {
        // Get stored state from cookies
        const cookieStore = await cookies();
        const storedState = cookieStore.get('tiktok_auth_state')?.value;

        // Validate state to prevent CSRF
        if (state !== storedState) {
            return NextResponse.redirect(
                `${baseUrl}/settings?error=${encodeURIComponent('Invalid state parameter')}`
            );
        }

        // Exchange code for tokens (no verifier needed for Web flow)
        const tokens = await exchangeCodeForTokens(code, redirectUri);

        // Get user info
        const userInfo = await getTikTokUserInfo(tokens.accessToken);

        // Get authenticated Supabase user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.redirect(
                `${baseUrl}/settings?error=${encodeURIComponent('Not authenticated')}`
            );
        }

        // Store connection in database
        const { error: dbError } = await supabase
            .from('connected_accounts')
            .upsert(
                {
                    user_id: user.id,
                    platform: 'tiktok',
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    token_expires_at: tokens.expiresAt.toISOString(),
                    platform_user_id: userInfo.open_id,
                    platform_username: userInfo.display_name, // TikTok API v2 "display_name" as username
                    connected_at: new Date().toISOString(),
                },
                {
                    onConflict: 'user_id,platform',
                }
            );

        if (dbError) {
            console.error('Failed to save TikTok connection:', dbError);
            return NextResponse.redirect(
                `${baseUrl}/settings?error=${encodeURIComponent('Failed to save connection')}`
            );
        }

        // Clear cookies
        cookieStore.delete('tiktok_auth_state');
        cookieStore.delete('tiktok_code_verifier');

        // Redirect to settings with success message
        return NextResponse.redirect(
            `${baseUrl}/settings?success=${encodeURIComponent(`Connected to TikTok as ${userInfo.display_name}`)}`
        );

    } catch (err) {
        console.error('TikTok callback error:', err);
        return NextResponse.redirect(
            `${baseUrl}/settings?error=${encodeURIComponent('Failed to complete TikTok authorization')}`
        );
    }
}
