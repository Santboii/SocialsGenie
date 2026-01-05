# SocialsGenie - Agent Rules

## Imperative Rules
- Always verify file paths and content within the provided context before making assertions.
- If information is missing, state the limitation clearly instead of assuming or hallucinating details.
- Ensure all generated code and logic are strictly grounded in the provided codebase context.
- **Strict Typing:** Always respect TypeScript strict usage. Avoid `any` types; use specific types or `unknown` with type guards.
- **Linting Compliance:** Address linting issues immediately as they arise during code modification. Do not leave new lint errors unresolved.

## Code Style

### Components
- Use `'use client';` directive at top of client components
- Use CSS Modules for styling (`.module.css` files)
- Use design tokens from `globals.css` (e.g., `var(--space-4)`, `var(--accent-purple)`)
- Prefer `className={styles.name}` over inline styles
- Export components as `export default function ComponentName()`

### API Routes
- Always check auth first: `const { data: { user }, error } = await supabase.auth.getUser();`
- Return early with appropriate status codes (401, 400, 404, 500)
- Use `NextResponse.json()` for all responses
- Wrap in try/catch and log errors with `console.error()`
- Check for required env vars before using (e.g., `GOOGLE_API_KEY`)

### TypeScript
- Define types in `src/types/index.ts`
- Use `PlatformId` type for platform identifiers, not raw strings
- Use `PostStatus` type for post states

### Imports
- Use absolute imports with `@/` prefix (e.g., `@/lib/supabase/server`)
- Group imports: React → Next.js → External → Internal → Types → Styles

## Supabase

- Use `createClient()` from `@/lib/supabase/server` in API routes
- Use `createBrowserClient()` from `@/lib/supabase/client` in client components
- Always check for auth errors before proceeding

## AI Integration

- AI service lives in `src/lib/ai/google.ts`
- Always fetch brand profile before AI generation for context
- Handle image generation failures gracefully (don't fail whole request)

## Design

- Dark theme is default
- Primary accent: purple (`#a855f7`)
- Use spacing scale: `--space-1` through `--space-16`
- Use border radius scale: `--radius-sm` through `--radius-full`

## Dates

- Current year is **2025** for all content and references

## Documentation

When working with frameworks or libraries, look up the official documentation for the specific version being used. Do not rely on outdated patterns.

**Check `package.json` for current versions** of:
- Next.js
- React  
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Google Generative AI (`@google/generative-ai`)
- TypeScript

Key documentation:
- Next.js App Router: https://nextjs.org/docs/app
- Supabase JS: https://supabase.com/docs/reference/javascript
- Google Generative AI: https://ai.google.dev/gemini-api/docs
