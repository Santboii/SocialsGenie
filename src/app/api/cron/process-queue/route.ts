import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { GoogleGeminiService } from '@/lib/ai/google';

// Initialize AI service
const aiService = new GoogleGeminiService(process.env.GOOGLE_ATTRIBUTION_API_KEY || '');

export async function GET(request: Request) {
    // 1. Authenticate Request
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow unauthorized for now for testing if secret is missing in dev, but log warning
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.warn('CRON running without secret verification (Dev Mode)');
    }

    // Use Admin Client to bypass RLS since CRON has no user session
    const supabase = createAdminClient();
    const now = new Date();

    // Get current time and day
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const currentHour = now.getHours();

    // We match slots scheduled for this Hour (HH:00:00)
    // Note: This relies on the system running this job at XX:00-XX:14 roughly.
    const timeString = `${currentHour.toString().padStart(2, '0')}:00:00`;

    try {
        // 2. Fetch Matching Slots
        const { data: slots, error: slotsError } = await supabase
            .from('weekly_slots')
            .select('*, content_libraries!inner(*)') // Inner join to ensure library exists
            .eq('day_of_week', dayOfWeek)
            .eq('time_of_day', timeString);

        if (slotsError) {
            console.error('Error fetching slots:', slotsError);
            throw slotsError;
        }

        if (!slots || slots.length === 0) {
            return NextResponse.json({ message: 'No slots scheduled for this hour.' });
        }

        const results = [];

        // 3. Process Each Slot
        for (const slot of slots) {
            // content_libraries is usually an object with inner join, but TypeScript might see array
            const library = Array.isArray(slot.content_libraries)
                ? slot.content_libraries[0]
                : slot.content_libraries;

            if (!library || library.is_paused) continue;

            // 3a. Find valid post in library (FIFO)
            // We find "Evergreen" posts belonging to this library
            const { data: posts, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .eq('library_id', library.id)
                .eq('status', 'draft') // One-Time Queue Logic
                .order('last_published_at', { ascending: true, nullsFirst: true }) // Doesn't matter much for drafts (always null), but creates FIFO
                .order('created_at', { ascending: true }) // Oldest created first
                .limit(1);

            if (postsError) {
                console.error(`Error fetching posts for lib ${library.id}:`, postsError);
                continue;
            }

            const sourcePost = posts?.[0];
            if (!sourcePost) {
                results.push({ slot: slot.id, result: 'Empty library' });
                continue;
            }

            // 3b. Publish Post (Update Status)
            // One-Time Queue: We just update the draft to 'published'

            const { data: updatedPost, error: updateError } = await supabase
                .from('posts')
                .update({
                    status: 'published',
                    published_at: new Date().toISOString(),
                    // Ensure it's not considered evergreen
                    is_evergreen: false
                })
                .eq('id', sourcePost.id)
                .select()
                .single();

            if (updateError) {
                console.error('Failed to publish post:', updateError);
                results.push({ slot: slot.id, error: updateError.message });
                continue;
            }

            // 3c. Log Activity
            await supabase.from('activities').insert({
                user_id: slot.user_id,
                type: 'published',
                message: `Auto-published from "${library.name}" library`,
                post_id: sourcePost.id,
            });

            results.push({
                slot: slot.id,
                action: 'published',
                post: sourcePost.id
            });
        }

        return NextResponse.json({ success: true, processed: results.length, details: results });

    } catch (error: any) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
