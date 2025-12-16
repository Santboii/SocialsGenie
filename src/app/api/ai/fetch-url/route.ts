import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { message: 'URL is required' },
                { status: 400 }
            );
        }

        // Fetch the URL content
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SocialMediaCopilot/1.0)',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: `Failed to fetch URL: ${response.status}` },
                { status: 400 }
            );
        }

        const html = await response.text();

        // Basic text extraction (strip HTML tags, get meaningful content)
        const content = extractTextFromHtml(html);

        return NextResponse.json({ content });
    } catch (error) {
        console.error('Fetch URL error:', error);
        return NextResponse.json(
            { message: 'Failed to fetch URL content' },
            { status: 500 }
        );
    }
}

function extractTextFromHtml(html: string): string {
    // Remove script and style elements
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Limit to reasonable length for context
    return text.slice(0, 5000);
}
