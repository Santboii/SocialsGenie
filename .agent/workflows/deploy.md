---
description: How to deploy SocialsGenie to Vercel
---

# Deploy to Vercel

## Prerequisites
- Code committed and pushed to `main` branch on GitHub
- Vercel account connected to the GitHub repository

## Automatic Deployment
Vercel auto-deploys when you push to `main`:

```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

## Manual Deployment (Vercel CLI)

// turbo
1. Run production deployment:
```bash
vercel --prod
```

## Environment Variables Required in Vercel Dashboard
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_API_KEY`

## Verify Deployment
After deployment, check:
- Landing page: `/landing`
- Login: `/login`
- Dashboard: `/` (requires auth)
- Compose: `/compose`
