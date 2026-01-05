import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGeminiService } from '@/lib/ai/google';
import { LibraryAiSettings } from '@/types';

import { GoogleGenerativeAI } from '@google/generative-ai';

const aiService = new GoogleGeminiService(process.env.GOOGLE_API_KEY || '');

export async function POST(request: Request) {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { libraryId, topicPrompt, count = 5 } = await request.json();

        if (!libraryId || !topicPrompt) {
            return NextResponse.json({ error: 'libraryId and topicPrompt are required' }, { status: 400 });
        }

        // Verify library belongs to user
        const { data: library, error: libError } = await supabase
            .from('content_libraries')
            .select('*')
            .eq('id', libraryId)
            .eq('user_id', user.id)
            .single();

        if (libError || !library) {
            return NextResponse.json({ error: 'Library not found' }, { status: 404 });
        }

        const settings = (library.ai_settings || {}) as LibraryAiSettings;
        const tone = settings.tone === 'Custom' ? settings.custom_tone : (settings.tone || 'Professional');
        const audience = settings.audience ? `Target Audience: ${settings.audience}` : '';
        const language = settings.language || 'English';
        const lengthMap = {
            'short': 'very short (under 50 words)',
            'medium': 'medium length (50-150 words)',
            'long': 'longer, detailed posts (150+ words)'
        };
        // Determine intelligent defaults based on platforms
        const targetPlatforms = library.platforms || [];
        const isTwitterOnly = targetPlatforms.length === 1 && targetPlatforms[0] === 'twitter';
        const hasLongFormSupport = targetPlatforms.some((p: string) => ['linkedin', 'facebook'].includes(p));

        const defaultLength = isTwitterOnly ? 'concise (under 280 chars)'
            : hasLongFormSupport ? 'engaging (150-500 words)'
                : 'concise but engaging (under 500 chars)';

        const lengthInstruction = lengthMap[settings.length as keyof typeof lengthMap] || defaultLength;
        const emojiInstruction = settings.use_emojis === false ? 'Do NOT use emojis.' : 'Include relevant emojis.';

        // Fix: Check both the top-level column (source of truth from create-library) AND the settings JSON
        const shouldGenerateImages = library.generate_images || settings.generate_images;

        const imageInstruction = shouldGenerateImages
            ? 'Also generate a detailed prompt for an AI image generator ("imagePrompt") for each post. The user wants imagery with TEXT ON TOP (typography, poster style).'
            : 'Do not generate image prompts.';

        let hashtagInstruction = 'Do NOT include hashtags.';
        if (settings.hashtag_strategy === 'auto') {
            hashtagInstruction = 'Include 3-5 relevant, high-traffic hashtags at the end of each post.';
        } else if (settings.hashtag_strategy === 'custom' && settings.custom_hashtags) {
            hashtagInstruction = `Append exactly these hashtags to every post: ${settings.custom_hashtags}`;
        }

        // Create platform-specific prompt instructions
        const platformInstructions: string[] = [];
        const requestedVariants: string[] = [];

        if (targetPlatforms.includes('twitter')) {
            platformInstructions.push("- For Twitter (X): STRICT LIMIT: Must be under 280 characters. Concise, punchy, no hashtags.");
            requestedVariants.push('twitter');
        }
        if (targetPlatforms.includes('threads')) {
            platformInstructions.push("- For Threads: Conversational, under 500 characters. Can be slightly longer than Twitter.");
            requestedVariants.push('threads');
        }
        if (targetPlatforms.includes('linkedin')) {
            platformInstructions.push("- For LinkedIn: The Master Content will be used. Ensure Master Content is professional and valuable.");
            // Do NOT add to requestedVariants. Use Shared.
        }
        if (targetPlatforms.includes('instagram')) {
            platformInstructions.push("- For Instagram: The Master Content will be used. Ensure Master Content works well as a caption.");
            // Do NOT add to requestedVariants. Use Shared.
        }
        if (targetPlatforms.includes('facebook')) {
            platformInstructions.push("- For Facebook: The Master Content will be used. Ensure Master Content is engaging.");
            // Do NOT add to requestedVariants. Use Shared.
        }

        const validVariants = requestedVariants.length > 0 ? requestedVariants : ["twitter"];

        const prompt = `You are a social media content expert. Generate ${count} unique, engaging social media posts about: "${topicPrompt}"
        
CONTEXT:
- Tone: ${tone}
- Language: ${language}
- ${audience}

REQUIREMENTS:
- ${emojiInstruction}
- ${hashtagInstruction}
- ${imageInstruction}
- IF generating image prompts: 
    - The text on the image must be legible and spelled correctly. Explicitly state the text to be rendered in quotation marks within the image prompt.
    - **CHARACTER FIDELITY**: If the post topic mentions a specific character, celebrity, or known intellectual property (e.g., "Mario", "Batman", "Mickey Mouse"), the image prompt MUST explicitly specify "exact official design", "canonical appearance", and "accurate depiction". Do NOT describe a generic lookalike. Use the entity's distinct visual traits (e.g., "Mario's specific red cap with M logo, blue overalls, mustache").
- Create a "Master Idea" content that is platform-neutral (${lengthInstruction}).
- Create specific variants for: ${validVariants.join(', ')}.

PLATFORM RULES:
${platformInstructions.join('\n')}

CRITICAL OUTPUT FORMATTING:
- Return ONLY a valid JSON array.
- Do NOT wrap in markdown code blocks (no \`\`\`json).
- Do NOT include any conversational text.
- Ensure "platform_content" keys match exactly: ${validVariants.join(', ')}.

EXAMPLE JSON STRUCTURE:
[
  {
    "content": "Master content here...",
    "imagePrompt": "A detailed description...",
    "platform_content": {
        "twitter": "Short tweet...",
        "linkedin": "Longer post...",
        "instagram": "Caption with line breaks..."
    }
  }
]`;

        // Direct call to text model via the service service's internal or public access? 
        // Refactoring to use the service requires the service to expose genAI or we use it here since we imported GoogleGeminiService.
        // But GoogleGeminiService.generatePost doesn't support batch/count well.
        // We'll reimplement the direct call here but assume we can allow the 'imagePrompt' field.

        // Re-init genAI here to keep existing logic structure or use service instance if exposed?
        // Let's stick to existing direct usage but update the prompt as above.
        // Wait, I replaced the import. I need to make sure I can use it.
        // GoogleGeminiService encapsulates the client. I should check if it exposes the client or if I should instantiate one locally.
        // The previous code had: const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
        // I'll put that back to be safe, while also keeping the service for generateImage.

        // Actually, let's keep the local initialization for the text generation part as it's custom batch logic.
        // And use aiService.generateImage for the images.

        // We need to restore the GoogleGenerativeAI import or assume it's available.
        // The previous code had it.
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log('Raw AI Response:', responseText);

        let jsonString = responseText;
        // 1. Try to find content within ```json ... ``` blocks
        const codeBlockMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (codeBlockMatch) {
            jsonString = codeBlockMatch[1];
        } else {
            // 2. Fallback: find the first '[' and the last ']'
            const firstBracket = responseText.indexOf('[');
            const lastBracket = responseText.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                jsonString = responseText.substring(firstBracket, lastBracket + 1);
            }
        }

        let generatedItems: { content: string, imagePrompt?: string, platform_content?: Record<string, string> }[] = [];
        try {
            generatedItems = JSON.parse(jsonString);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            console.error('Failed JSON string:', jsonString);
            throw new Error(`Failed to parse AI response. Raw: ${responseText.substring(0, 100)}...`);
        }

        // Generate images if requested
        const postsWithMedia = await Promise.all(generatedItems.map(async (item) => {
            const media: { id: string; type: 'image'; url: string }[] = [];
            // Use the consistent flag we derived earlier
            if (shouldGenerateImages && item.imagePrompt) {
                try {
                    console.log('Generating image for prompt:', item.imagePrompt);
                    const imageUrl = await aiService.generateImage(item.imagePrompt);
                    media.push({
                        id: crypto.randomUUID(),
                        type: 'image',
                        url: imageUrl
                    });
                } catch (imgError) {
                    console.error('Failed to generate image for post:', imgError);
                }
            }
            return {
                ...item,
                media
            };
        }));

        // Insert posts into database
        const postsToInsert = postsWithMedia.map(item => ({
            user_id: user.id,
            content: item.content,
            platform_content: item.platform_content || {},
            status: 'draft',
            library_id: libraryId,
            is_evergreen: true,
            media: item.media // Assuming DB supports this column (JSONB)
        }));

        const { data: insertedPosts, error: insertError } = await supabase
            .from('posts')
            .insert(postsToInsert)
            .select();

        if (insertError) {
            console.error('Insert error:', insertError);
            throw insertError;
        }

        // Insert platform assignments
        if (insertedPosts && insertedPosts.length > 0) {
            const targetPlatforms = (library.platforms && library.platforms.length > 0)
                ? library.platforms
                : ['twitter'];

            const platformAssignments = insertedPosts.flatMap((post, index) => {
                const originalItem = generatedItems[index];
                const variants = originalItem.platform_content || {};

                const normalizedVariants = Object.keys(variants).reduce((acc, key) => {
                    acc[key.toLowerCase()] = variants[key];
                    return acc;
                }, {} as Record<string, string>);

                return targetPlatforms.map((platform: string) => ({
                    post_id: post.id,
                    platform: platform,
                    custom_content: normalizedVariants[platform.toLowerCase()] || null
                }));
            });

            await supabase.from('post_platforms').insert(platformAssignments);
        }

        return NextResponse.json({
            success: true,
            posts: insertedPosts,
            count: insertedPosts?.length || 0,
        });

    } catch (error) {
        console.error('Failed to generate posts:', error);
        return NextResponse.json({ error: 'Failed to generate posts' }, { status: 500 });
    }
}
