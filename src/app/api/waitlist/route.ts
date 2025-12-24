import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return NextResponse.json(
                { error: 'Please provide a valid email address.' },
                { status: 400 }
            );
        }

        // Initialize Supabase Client. 
        // We use the ANON key here because the 'waitlist' table has an RLS policy 
        // that explicitly allows public inserts ("Allow generic inserts").
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            throw new Error('Supabase environment variables are missing.');
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { error } = await supabase
            .from('waitlist')
            .insert([{ email }]);

        if (error) {
            // Handle unique constraint violation (code 23505 in Postgres)
            if (error.code === '23505') {
                return NextResponse.json(
                    { message: 'You are already on the waitlist!' },
                    { status: 200 } // Treat as success to user
                );
            }
            console.error('Waitlist insert error:', error);
            return NextResponse.json(
                { error: 'Failed to join waitlist. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: 'Successfully joined the waitlist!' });
    } catch (error) {
        console.error('Waitlist API error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}
