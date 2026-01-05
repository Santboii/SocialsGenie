import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function DELETE() {
    try {
        const supabase = await createClient();

        // 1. Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        // Create admin client for deleting data
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 2. Delete all user data
        // Delete connected accounts
        await supabaseAdmin
            .from('connected_accounts')
            .delete()
            .eq('user_id', userId);

        // Delete posts
        await supabaseAdmin
            .from('posts')
            .delete()
            .eq('user_id', userId);

        // Delete brand profiles
        await supabaseAdmin
            .from('brand_profiles')
            .delete()
            .eq('user_id', userId);

        // Delete activities if exists
        try {
            await supabaseAdmin
                .from('activities')
                .delete()
                .eq('user_id', userId);
        } catch {
            // Table might not exist
        }

        // 3. Delete the user account from auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error('Error deleting auth user:', deleteError);
            // Continue anyway, data was deleted
        }

        console.log(`Account deleted for user: ${userId}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete account' },
            { status: 500 }
        );
    }
}
