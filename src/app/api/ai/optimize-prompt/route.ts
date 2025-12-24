import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // 1. Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Request
        const { prompt, platform } = await req.json();
        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        // 3. Fetch Brand Profile for context
        const { data: profile } = await supabase
            .from('brand_profiles')
            .select('brand_name, tone, target_audience, key_messages')
            .eq('user_id', user.id)
            .single();

        // 4. Initialize AI
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'AI Service Misconfigured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // 5. Build Optimization Prompt
        const systemPrompt = `
You are an expert prompt engineer specializing in social media content creation.

TASK: Transform the user's brief idea into a detailed, optimized prompt that will generate better social media content.

USER'S ORIGINAL IDEA:
"""
${prompt}
"""

${platform ? `TARGET PLATFORM: ${platform}` : ''}

${profile ? `
BRAND CONTEXT:
- Brand: ${profile.brand_name || 'Not specified'}
- Tone: ${profile.tone || 'Professional and friendly'}
- Target Audience: ${profile.target_audience || 'General audience'}
- Key Messages: ${profile.key_messages?.join(', ') || 'None specified'}
` : ''}

INSTRUCTIONS:
- You are a PROMPT ENGINEER, not a copywriter.
- Do NOT write the social media post.
- Write a detailed PROMPT that someone else would use to write the post.
- The user is giving you a simple topic/idea. You must expand it into a sophisticated prompt.

EXAMPLES:
Input: "Summer sale"
Output: "Write an energetic and urgent promotional post for our annual Summer Sale, highlighting 50% off discounts on swimwear and accessories. Use a fun, sunny tone and include emojis like ☀️ and 🏖️. Target young adults looking for vacation outfits."

Input: "New coffee flavor launching"
Output: "Create a cozy and inviting announcement for our new 'Maple Pecan' coffee blend. Describe the warm, nutty aroma and sweet flavor profile. Appeal to office workers looking for a morning treat. Ask followers to tag a coffee buddy."

CURRENT REQUEST:
- User's Idea: "${prompt}"
${platform ? `- Target Platform: ${platform}` : ''}
${profile ? `- Brand Brand: ${profile.brand_name}\n- Tone: ${profile.tone}` : ''}

Your goal is to return ONLY the optimized prompt string.
`;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const optimizedPrompt = response.text().trim();

        return NextResponse.json({
            optimizedPrompt,
            originalPrompt: prompt
        });

    } catch (error: unknown) {
        console.error('Optimize Prompt Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to optimize prompt';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
