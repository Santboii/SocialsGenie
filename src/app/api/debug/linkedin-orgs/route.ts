import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get LinkedIn token
        const { data: connection } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', 'linkedin')
            .single();

        if (!connection) {
            return NextResponse.json({ error: 'No LinkedIn connection found' });
        }

        // List organizations
        const response = await fetch('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED', {
            headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'X-Restli-Protocol-Version': '2.0.0',
            },
        });

        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error: 'Failed to fetch orgs', details: error }, { status: response.status });
        }

        const data = await response.json();

        // Enrich with names
        const orgs = [];
        for (const element of data.elements) {
            const orgUrn = element.organizationalTarget;
            // Fetch name
            const detailsRes = await fetch(`https://api.linkedin.com/v2/organizations/${orgUrn.split(':').pop()}`, {
                headers: {
                    'Authorization': `Bearer ${connection.access_token}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            });

            if (detailsRes.ok) {
                const details = await detailsRes.json();
                orgs.push({
                    name: details.localizedName,
                    urn: orgUrn,
                    id: orgUrn.split(':').pop()
                });
            } else {
                orgs.push({ urn: orgUrn, error: 'Could not fetch details' });
            }
        }

        return NextResponse.json({ organizations: orgs });

    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
