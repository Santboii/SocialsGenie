import { NextRequest, NextResponse } from 'next/server';
import { publishScheduledPosts } from '@/lib/publishing';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const results = await publishScheduledPosts();
        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error('Cron job execution failed:', error);
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
