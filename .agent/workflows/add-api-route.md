---
description: How to add a new API route to SocialsGenie
---

# Add New API Route

## File Location
Create new route at: `src/app/api/[category]/[endpoint]/route.ts`

## Template
```typescript
import { createClient } from '@/lib/supabase/server';
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
        const body = await req.json();
        if (!body.requiredField) {
            return NextResponse.json({ error: 'Missing required field' }, { status: 400 });
        }

        // 3. Business Logic
        // ... your logic here

        // 4. Return Response
        return NextResponse.json({ success: true, data: result });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Something went wrong' },
            { status: 500 }
        );
    }
}
```

## Checklist
- [ ] Auth check at start
- [ ] Input validation
- [ ] Proper error handling with status codes
- [ ] Consistent response format
