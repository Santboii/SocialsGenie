import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
    generateCodeVerifier,
    generateCodeChallenge,
    generateState,
    getXAuthUrl,
} from '@/lib/social/x';

/**
 * Initiates X OAuth 2.0 authorization flow with PKCE
 * GET /api/auth/x
 */
export async function GET() {
    try {
        // Generate PKCE values
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const state = generateState();

        // Build redirect URI
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/api/auth/x/callback`;

        // Store verifier and state in secure cookies (needed for callback)
        const cookieStore = await cookies();

        cookieStore.set('x_code_verifier', codeVerifier, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        });

        cookieStore.set('x_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        });

        // Generate authorization URL and redirect
        const authUrl = getXAuthUrl(redirectUri, state, codeChallenge);

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('X OAuth initiation error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?error=Failed to start X authorization`
        );
    }
}
