import { NextRequest, NextResponse } from 'next/server';
import { createPin } from '@/lib/social/pinterest';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { accessToken, boardId, title, description, imageUrl, link } = body;

        if (!accessToken || !boardId || !imageUrl || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await createPin(accessToken, boardId, title, description, imageUrl, link);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Pinterest Publish API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to publish to Pinterest' }, { status: 500 });
    }
}
