import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
    exchangeCodeForTokens,
    getPinterestUserInfo,
} from '@/lib/social/pinterest';

/**
 * Handles Pinterest OAuth 2.0 callback
 * GET /api/auth/pinterest/callback
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/pinterest/callback`;

    // Handle authorization errors from Pinterest
    if (error) {
        console.error('Pinterest OAuth error:', error);
        return NextResponse.redirect(
            `${baseUrl}/settings?error=${encodeURIComponent(`Pinterest authorization failed: ${error}`)}`
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
        const storedState = cookieStore.get('pinterest_oauth_state')?.value;

        // Validate state to prevent CSRF
        if (state !== storedState) {
            return NextResponse.redirect(
                `${baseUrl}/settings?error=${encodeURIComponent('Invalid state parameter')}`
            );
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code, redirectUri);

        // Get user info
        const userInfo = await getPinterestUserInfo(tokens.accessToken);

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
                    platform: 'pinterest',
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    token_expires_at: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString() : null,
                    platform_user_id: userInfo.id,
                    platform_username: userInfo.username,
                    connected_at: new Date().toISOString(),
                    metadata: {
                        display_name: userInfo.display_name,
                        profile_image: userInfo.profile_image
                    }
                },
                {
                    onConflict: 'user_id,platform',
                }
            );

        if (dbError) {
            console.error('Failed to save Pinterest connection:', dbError);
            return NextResponse.redirect(
                `${baseUrl}/settings?error=${encodeURIComponent('Failed to save Pinterest connection details')}`
            );
        }

        // Clear state cookie
        cookieStore.delete('pinterest_oauth_state');

        // Redirect to settings with success message
        return NextResponse.redirect(
            `${baseUrl}/settings?success=${encodeURIComponent(`Connected to Pinterest as ${userInfo.display_name || userInfo.username}`)}`
        );

    } catch (err) {
        console.error('Pinterest callback error:', err);
        return NextResponse.redirect(
            `${baseUrl}/settings?error=${encodeURIComponent('Failed to complete Pinterest authorization')}`
        );
    }
}
