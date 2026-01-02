import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPinterestBoards, refreshPinterestToken } from '@/lib/social/pinterest';

/**
 * GET /api/pinterest/boards
 * Fetches boards for the connected Pinterest account
 */
export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get Pinterest connection
        const { data: connection, error: dbError } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', 'pinterest')
            .single();

        if (dbError || !connection) {
            return NextResponse.json({ error: 'Pinterest account not connected' }, { status: 404 });
        }

        let accessToken = connection.access_token;
        const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;

        // Check if token needs refresh (refresh if expired or expires in < 5 mins)
        if (expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
            if (!connection.refresh_token) {
                return NextResponse.json({ error: 'Pinterest token expired and no refresh token available' }, { status: 401 });
            }

            try {
                const newTokens = await refreshPinterestToken(connection.refresh_token);
                accessToken = newTokens.accessToken;

                // Update tokens in DB
                await supabase
                    .from('connected_accounts')
                    .update({
                        access_token: newTokens.accessToken,
                        refresh_token: newTokens.refreshToken || connection.refresh_token, // specific handling if refresh token rotates
                        token_expires_at: newTokens.expiresIn ? new Date(Date.now() + newTokens.expiresIn * 1000).toISOString() : null,
                    })
                    .eq('id', connection.id);

            } catch (refreshError) {
                console.error('Failed to refresh Pinterest token:', refreshError);
                return NextResponse.json({ error: 'Failed to refresh Pinterest session' }, { status: 401 });
            }
        }

        const boards = await getPinterestBoards(accessToken);

        return NextResponse.json({ boards });

    } catch (error) {
        console.error('Error fetching Pinterest boards:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
