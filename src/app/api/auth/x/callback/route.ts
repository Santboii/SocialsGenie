import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
    exchangeCodeForTokens,
    getXUserInfo,
} from '@/lib/social/x';

/**
 * Handles X OAuth 2.0 callback
 * GET /api/auth/x/callback
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/x/callback`;

    // Handle authorization errors from X
    if (error) {
        console.error('X OAuth error:', error);
        return NextResponse.redirect(
            `${baseUrl}/settings?error=${encodeURIComponent(`X authorization failed: ${error}`)}`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${baseUrl}/settings?error=${encodeURIComponent('Missing authorization code or state')}`
        );
    }

    try {
        // Get stored PKCE values from cookies
        const cookieStore = await cookies();
        const storedState = cookieStore.get('x_oauth_state')?.value;
        const codeVerifier = cookieStore.get('x_code_verifier')?.value;

        // Validate state to prevent CSRF
        if (state !== storedState) {
            return NextResponse.redirect(
                `${baseUrl}/settings?error=${encodeURIComponent('Invalid state parameter')}`
            );
        }

        if (!codeVerifier) {
            return NextResponse.redirect(
                `${baseUrl}/settings?error=${encodeURIComponent('Missing code verifier')}`
            );
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);

        // Get user info
        const userInfo = await getXUserInfo(tokens.accessToken);

        // Get authenticated Supabase user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.redirect(
                `${baseUrl}/settings?error=${encodeURIComponent('Not authenticated')}`
            );
        }

        // Store connection in database (upsert to handle reconnection)
        const { error: dbError } = await supabase
            .from('connected_accounts')
            .upsert(
                {
                    user_id: user.id,
                    platform: 'twitter', // Keep 'twitter' in DB for consistency with types
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    token_expires_at: tokens.expiresAt.toISOString(),
                    platform_user_id: userInfo.id,
                    platform_username: userInfo.username,
                    connected_at: new Date().toISOString(),
                },
                {
                    onConflict: 'user_id,platform',
                }
            );

        if (dbError) {
            console.error('Failed to save X connection:', dbError);
            return NextResponse.redirect(
                `${baseUrl}/settings?error=${encodeURIComponent('Failed to save connection')}`
            );
        }

        // Clear PKCE cookies
        cookieStore.delete('x_oauth_state');
        cookieStore.delete('x_code_verifier');

        // Redirect to settings with success message
        return NextResponse.redirect(
            `${baseUrl}/settings?success=${encodeURIComponent(`Connected to X as @${userInfo.username}`)}`
        );

    } catch (err) {
        console.error('X callback error:', err);
        return NextResponse.redirect(
            `${baseUrl}/settings?error=${encodeURIComponent('Failed to complete X authorization')}`
        );
    }
}
