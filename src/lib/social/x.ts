/**
 * X (Twitter) API Client
 * 
 * Handles OAuth 2.0 PKCE flow and posting to X
 * API Docs: https://developer.x.com/en/docs/twitter-api
 */

import crypto from 'crypto';

// OAuth 2.0 URLs
const AUTH_URL = 'https://x.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const API_BASE = 'https://api.x.com/2';

// Required scopes for posting
const SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

export interface XTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    userId?: string;
    username?: string;
}

export interface XUser {
    id: string;
    name: string;
    username: string;
}

// ============================================
// PKCE Helpers
// ============================================

/**
 * Generate a cryptographically random code verifier
 */
export function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * Create code challenge from verifier using SHA256
 */
export function generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
    return crypto.randomBytes(16).toString('hex');
}

// ============================================
// OAuth 2.0 Flow
// ============================================

/**
 * Generate the X OAuth 2.0 authorization URL with PKCE
 */
export function getXAuthUrl(
    redirectUri: string,
    state: string,
    codeChallenge: string
): string {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.X_CLIENT_ID!,
        redirect_uri: redirectUri,
        scope: SCOPES.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    return `${AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
): Promise<XTokens> {
    const clientId = process.env.X_CLIENT_ID!;
    const clientSecret = process.env.X_CLIENT_SECRET!;

    // Basic auth header with client credentials
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('X token exchange error:', error);
        throw new Error(`Failed to exchange code: ${response.status}`);
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<XTokens> {
    const clientId = process.env.X_CLIENT_ID!;
    const clientSecret = process.env.X_CLIENT_SECRET!;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('X token refresh error:', error);
        throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
}

// ============================================
// API Calls
// ============================================

/**
 * Get authenticated user info
 */
export async function getXUserInfo(accessToken: string): Promise<XUser> {
    const response = await fetch(`${API_BASE}/users/me`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('X user info error:', error);
        throw new Error(`Failed to get user info: ${response.status}`);
    }

    const data = await response.json();
    return data.data as XUser;
}

/**
 * Post a tweet
 */
/**
 * Upload media to X (Twitter) v1.1 API
 * Note: Uses v1.1 because v2 media upload is not yet fully standard/available for all endpoints.
 */
export async function uploadMedia(
    accessToken: string,
    fileBuffer: Buffer,
    mimeType: string
): Promise<string> {
    const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');

    // Manually construct multipart form data body
    // This is often more reliable than using FormData in server-side edge cases with standard fetch
    let body = Buffer.concat([
        Buffer.from(`--${boundary}\r\n`, 'utf8'),
        Buffer.from(`Content-Disposition: form-data; name="media"; filename="image"\r\n`, 'utf8'),
        Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`, 'utf8'),
        fileBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
    ]);

    const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('X media upload error:', error);
        throw new Error(`Failed to upload media: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.media_id_string;
}

/**
 * Post a tweet
 */
export async function postTweet(
    accessToken: string,
    text: string,
    mediaIds: string[] = []
): Promise<{ id: string; text: string }> {
    const body: any = { text };

    if (mediaIds.length > 0) {
        body.media = { media_ids: mediaIds };
    }

    const response = await fetch(`${API_BASE}/tweets`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('X post tweet error:', error);
        throw new Error(`Failed to post tweet: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data;
}
