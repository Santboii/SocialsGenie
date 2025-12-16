import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { message: 'OpenAI API key not configured. Set OPENAI_API_KEY in your environment.' },
            { status: 500 }
        );
    }

    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json(
                { message: 'Prompt is required' },
                { status: 400 }
            );
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert social media copywriter. You write engaging, platform-appropriate content that drives engagement. Always respond with just the post content, nothing else.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API error:', error);
            return NextResponse.json(
                { message: error.error?.message || 'OpenAI API error' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            return NextResponse.json(
                { message: 'No content generated' },
                { status: 500 }
            );
        }

        return NextResponse.json({ content });
    } catch (error) {
        console.error('Generate error:', error);
        return NextResponse.json(
            { message: 'Failed to generate content' },
            { status: 500 }
        );
    }
}
