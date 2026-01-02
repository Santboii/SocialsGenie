import { generateId } from '@/types';

const CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET;
const PINTEREST_AUTH_URL = 'https://www.pinterest.com/oauth/';
const PINTEREST_TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token';
const PINTEREST_API_URL = 'https://api.pinterest.com/v5';

/**
 * Generates the Pinterest OAuth authorization URL
 */
export function getPinterestAuthUrl(redirectUri: string, state: string): string {
    if (!CLIENT_ID) {
        throw new Error('Missing PINTEREST_CLIENT_ID');
    }

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        state: state,
        scope: 'boards:read,boards:write,pins:read,pins:write,user_accounts:read',
    });

    return `${PINTEREST_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Missing Pinterest credentials');
    }

    // Pinterest requires Basic Auth for the token endpoint
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
    });

    const response = await fetch(PINTEREST_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange token: ${error}`);
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshToken: data.refresh_token,
        refreshExpiresIn: data.refresh_token_expires_in,
    };
}

/**
 * Refresh Pinterest access token
 */
export async function refreshPinterestToken(refreshToken: string) {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Missing Pinterest credentials');
    }

    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });

    const response = await fetch(PINTEREST_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshToken: data.refresh_token, // Pinterest returns a new refresh token? Docs say yes/maybe, we'll store if present
        refreshExpiresIn: data.refresh_token_expires_in,
    };
}

/**
 * Fetches user profile information
 */
export async function getPinterestUserInfo(accessToken: string) {
    const response = await fetch(`${PINTEREST_API_URL}/user_account`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch user info');
    }

    const data = await response.json();
    return {
        id: data.username, // Using username as ID since Pinterest doesn't always expose a stable numeric ID easily, or we can use the one from the response if available. v5 returns 'username', 'account_type', 'profile_image'.
        username: data.username,
        display_name: data.business_name || data.username, // Business name might be null for personal
        profile_image: data.profile_image,
    };
}

export interface PinterestBoard {
    id: string;
    name: string;
    description: string;
    privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

/**
 * Fetch all boards for the authenticated user
 */
export async function getPinterestBoards(accessToken: string): Promise<PinterestBoard[]> {
    let allBoards: PinterestBoard[] = [];
    let bookmark: string | null = null;

    // Simple pagination loop
    do {
        const url = new URL(`${PINTEREST_API_URL}/boards`);
        if (bookmark) {
            url.searchParams.set('bookmark', bookmark);
        }

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            // If fetching boards fails, we might just return what we have or throw.
            // Throwing is safer so the UI knows something went wrong.
            const errorText = await response.text();
            throw new Error(`Failed to fetch boards: ${errorText}`);
        }

        const data = await response.json();
        allBoards = allBoards.concat(data.items);
        bookmark = data.bookmark;
    } while (bookmark);

    return allBoards;
}

/**
 * Create a Pin (Post)
 */
export async function createPin(
    accessToken: string,
    boardId: string,
    title: string | undefined,
    description: string,
    imageUrl: string, // Pinterest v5 requires an image URL or media source. For MVP we assume we have a public URL (e.g. from Supabase Storage)
    link?: string
) {
    const postBody = {
        board_id: boardId,
        media_source: {
            source_type: 'image_url',
            url: imageUrl,
        },
        title: title ? title.substring(0, 100) : undefined,
        description: description.substring(0, 500),
        link: link,
    };

    const response = await fetch(`${PINTEREST_API_URL}/pins`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Pinterest Create Pin failed:', errorText);
        throw new Error(`Failed to create Pin: ${errorText}`);
    }

    const data = await response.json();
    return {
        id: data.id,
        success: true,
        url: `https://www.pinterest.com/pin/${data.id}/` // Constructing public URL
    };
}

export function generateState(): string {
    return generateId();
}
