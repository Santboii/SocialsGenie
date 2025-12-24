import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { postTweet, refreshAccessToken } from '@/lib/social/x';

/**
 * Publish a tweet to X
 * POST /api/publish/x
 * Body: { postId: string } or { content: string }
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await request.json();
        const { postId, content } = body;

        // Get content from post or use direct content
        let tweetText: string;

        if (postId) {
            const { data: post, error: postError } = await supabase
                .from('posts')
                .select('content')
                .eq('id', postId)
                .eq('user_id', user.id)
                .single();

            if (postError || !post) {
                return NextResponse.json({ error: 'Post not found' }, { status: 404 });
            }
            tweetText = post.content;
        } else if (content) {
            tweetText = content;
        } else {
            return NextResponse.json({ error: 'Missing postId or content' }, { status: 400 });
        }

        // Get X connection
        const { data: connection, error: connError } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', 'twitter')
            .single();

        if (connError || !connection) {
            return NextResponse.json({ error: 'X account not connected' }, { status: 400 });
        }

        let accessToken = connection.access_token;

        // Refresh token if expired
        if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
            try {
                const newTokens = await refreshAccessToken(connection.refresh_token);
                accessToken = newTokens.accessToken;

                // Update stored tokens
                await supabase
                    .from('connected_accounts')
                    .update({
                        access_token: newTokens.accessToken,
                        refresh_token: newTokens.refreshToken,
                        token_expires_at: newTokens.expiresAt.toISOString(),
                    })
                    .eq('user_id', user.id)
                    .eq('platform', 'twitter');
            } catch (refreshError) {
                console.error('Failed to refresh X token:', refreshError);
                return NextResponse.json(
                    { error: 'X token expired. Please reconnect your account.' },
                    { status: 401 }
                );
            }
        }

        // Post the tweet
        const tweet = await postTweet(accessToken, tweetText);

        return NextResponse.json({
            success: true,
            tweetId: tweet.id,
            tweetText: tweet.text,
        });

    } catch (error) {
        console.error('X publish error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to publish to X' },
            { status: 500 }
        );
    }
}
