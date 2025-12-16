import { PlatformId, ToneType, Suggestion, PlatformVariant, generateId, PLATFORMS } from '@/types';

// Platform-specific prompt configurations
const PLATFORM_PROMPTS: Record<PlatformId, { style: string; constraints: string }> = {
    twitter: {
        style: 'punchy, conversational, witty',
        constraints: 'Maximum 280 characters. Use 1-2 relevant hashtags. Be concise and impactful.',
    },
    linkedin: {
        style: 'professional, thought-leadership, insightful',
        constraints: 'Can be longer (up to 3000 chars). No hashtags or minimal. Include a call-to-action. Focus on value and expertise.',
    },
    instagram: {
        style: 'visual, engaging, lifestyle-focused',
        constraints: 'Emoji-rich content. Include 5-10 relevant hashtags at the end. Engaging and relatable tone.',
    },
    facebook: {
        style: 'conversational, community-focused, shareable',
        constraints: 'Can be medium length. Ask questions to drive engagement. Minimal hashtags.',
    },
    threads: {
        style: 'casual, authentic, brief',
        constraints: 'Maximum 500 characters. Minimal or no hashtags. Conversational and real.',
    },
};

const TONE_DESCRIPTIONS: Record<ToneType, string> = {
    casual: 'friendly, relaxed, conversational like talking to a friend',
    professional: 'polished, authoritative, business-appropriate but not stiff',
    promotional: 'exciting, action-oriented, highlighting benefits and creating urgency',
};

interface GeneratePostsOptions {
    topic: string;
    tone: ToneType;
    platforms: PlatformId[];
    sourceUrl?: string;
    urlContent?: string;
    pastPosts?: string[];
}

export async function generatePosts(options: GeneratePostsOptions): Promise<Suggestion> {
    const { topic, tone, platforms, sourceUrl, urlContent, pastPosts = [] } = options;

    const variants: PlatformVariant[] = [];

    for (const platformId of platforms) {
        const platform = PLATFORMS.find(p => p.id === platformId);
        if (!platform) continue;

        const platformConfig = PLATFORM_PROMPTS[platformId];
        const toneDesc = TONE_DESCRIPTIONS[tone];

        const prompt = buildPrompt({
            topic,
            tone: toneDesc,
            platformName: platform.name,
            platformStyle: platformConfig.style,
            platformConstraints: platformConfig.constraints,
            charLimit: platform.maxLength,
            urlContent,
            pastPosts,
        });

        try {
            const content = await callOpenAI(prompt);
            variants.push({
                platformId,
                content: content.trim(),
            });
        } catch (error) {
            console.error(`Failed to generate for ${platformId}:`, error);
            variants.push({
                platformId,
                content: `[Error generating content for ${platform.name}]`,
            });
        }
    }

    return {
        id: generateId(),
        topic,
        tone,
        sourceUrl,
        variants,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
}

interface PromptParams {
    topic: string;
    tone: string;
    platformName: string;
    platformStyle: string;
    platformConstraints: string;
    charLimit?: number;
    urlContent?: string;
    pastPosts: string[];
}

function buildPrompt(params: PromptParams): string {
    const {
        topic,
        tone,
        platformName,
        platformStyle,
        platformConstraints,
        charLimit,
        urlContent,
        pastPosts,
    } = params;

    let prompt = `You are an expert social media copywriter. Create a single ${platformName} post about the following topic.

TOPIC: ${topic}

TONE: ${tone}

PLATFORM STYLE: ${platformStyle}

CONSTRAINTS: ${platformConstraints}`;

    if (charLimit) {
        prompt += `\nCHARACTER LIMIT: ${charLimit} characters maximum (this is strict!)`;
    }

    if (urlContent) {
        prompt += `\n\nREFERENCE CONTENT (summarize/adapt this):\n${urlContent.slice(0, 2000)}`;
    }

    if (pastPosts.length > 0) {
        prompt += `\n\nSTYLE EXAMPLES (match this voice):\n${pastPosts.slice(0, 3).map(p => `- "${p}"`).join('\n')}`;
    }

    prompt += `\n\nRespond with ONLY the post content. No explanations, no quotes around it, no "Here's the post:" prefix. Just the raw post text ready to publish.`;

    return prompt;
}

async function callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate content');
    }

    const data = await response.json();
    return data.content;
}

// Fetch and extract text from a URL
export async function fetchUrlContent(url: string): Promise<string> {
    const response = await fetch('/api/ai/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch URL content');
    }

    const data = await response.json();
    return data.content;
}
