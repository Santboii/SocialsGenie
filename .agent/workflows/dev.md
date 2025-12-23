---
description: How to run SocialsGenie locally for development
---

# Local Development

## Start Development Server

// turbo
1. Install dependencies (if needed):
```bash
npm install
```

// turbo
2. Start the dev server:
```bash
npm run dev
```

Server runs at: http://localhost:3000

## Required Environment Variables
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_API_KEY=your_gemini_api_key
```

## Key Pages
- http://localhost:3000/landing - Marketing page
- http://localhost:3000/login - Authentication
- http://localhost:3000/ - Dashboard (auth required)
- http://localhost:3000/compose - Post composer
- http://localhost:3000/settings/brand - Brand DNA settings

## Supabase Local (Optional)
```bash
supabase start
```
