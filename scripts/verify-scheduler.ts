
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        envVars[key] = value;
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = envVars.CRON_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- Starting Scheduler Verification ---');

    // 1. Get or Create Test User
    // const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(1);
    // if (userError) throw userError;

    const userId = 'user_2t6C5q9uJz8j4w0X5y3kL7v1n2o'; // Replace with a real user ID from your database
    console.log(`Using User ID: ${userId}`);

    // Update User Timezone to UTC for consistent testing
    await supabase.from('profiles').update({ timezone: 'UTC' }).eq('id', userId);
    console.log('Set user timezone to UTC');

    // 2. Create Test Library
    const libName = `Test Lib ${Date.now()}`;
    const { data: library, error: libError } = await supabase
        .from('content_libraries')
        .insert({
            user_id: userId,
            name: libName,
            color: '#FF0000',
            is_paused: false
        })
        .select()
        .single();

    if (libError) throw libError;
    console.log(`Created Library: ${library.id} (${library.name})`);

    // 3. Create Draft Post
    const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
            user_id: userId,
            library_id: library.id,
            content: 'This is a test scheduled post from verification script.',
            status: 'draft'
        })
        .select()
        .single();

    if (postError) throw postError;
    console.log(`Created Draft Post: ${post.id}`);

    // 4. Create Weekly Slot for NOW
    const now = new Date();
    // Use UTC because we forced user to UTC
    const dayOfWeek = now.getUTCDay();
    const currentHour = now.getUTCHours();
    const timeOfDay = `${currentHour.toString().padStart(2, '0')}:00:00`;

    console.log(`Creating slot for Day: ${dayOfWeek}, Time: ${timeOfDay} (UTC)`);

    const { data: slot, error: slotError } = await supabase
        .from('weekly_slots')
        .insert({
            user_id: userId,
            library_id: library.id,
            day_of_week: dayOfWeek,
            time_of_day: timeOfDay,
            platform_ids: ['twitter']
        })
        .select()
        .single();

    if (slotError) throw slotError;
    console.log(`Created Weekly Slot: ${slot.id}`);

    // 5. Invoke Cron Endpoint
    console.log('Invoking Cron Endpoint...');
    const response = await fetch('http://localhost:3000/api/cron/publish', {
        headers: {
            'Authorization': `Bearer ${cronSecret}`
        }
    });

    const result = await response.json();
    console.log('Cron Response:', JSON.stringify(result, null, 2));

    // 6. Verify Post Status
    const { data: updatedPost, error: verifyError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', post.id)
        .single();

    if (verifyError) throw verifyError;

    if (updatedPost.status === 'scheduled' || updatedPost.status === 'published') {
        console.log(`SUCCESS: Post status is now "${updatedPost.status}"`);
        console.log('Scheduler is working correctly! ✅');
    } else {
        console.error(`FAILURE: Post status is still "${updatedPost.status}"`);
        console.log('Scheduler verification failed. ❌');
        console.log('Check if processWeeklySlots logic matches the slot time exactly.');
    }

    // Cleanup (Optional - keep for debugging)
    // await supabase.from('weekly_slots').delete().eq('id', slot.id);
    // await supabase.from('posts').delete().eq('id', post.id);
    // await supabase.from('content_libraries').delete().eq('id', library.id);
}

main().catch(err => {
    console.error('Script Error:', err);
    process.exit(1);
});
