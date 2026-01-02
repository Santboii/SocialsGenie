---
description: How to add a new social platform integration (Auth, API, UI)
---

# Workflow: Add New Social Platform

This workflow guides you through adding a new social provider (e.g., Pinterest, TikTok, YouTube) to SocialsGenie.

## 1. Preparation
- [ ] **Research API:** Identify Auth type (usually OAuth 2.0), posting endpoint, and required scopes.
- [ ] **Create App:** Create the app in the provider's developer portal.
    -   *Redirect URI:* `https://<your-domain>/api/auth/callback/<platform>` (Local: `http://localhost:3000/api/auth/callback/<platform>`)
- [ ] **Env Vars:** Add `PLATFORM_CLIENT_ID` and `PLATFORM_CLIENT_SECRET` to `.env.local`.

## 2. Core Configuration & Icons
- [ ] **Update Icons:**
    -   Find/create an SVG version of the official platform logo.
    -   Edit `src/components/ui/PlatformIcons.tsx`:
        -   Create a new export component `YourPlatformIcon`.
        -   Update `getPlatformIcon` helper function to return your new icon for the platform ID.
- [ ] **Update Types:**
    -   Edit `src/types/app.ts`:
        -   Add platform ID to `PlatformId` union.
        -   Add config object to `PLATFORMS` array (name, icon, color, limits).
        -   *Note:* The `icon` property in `PLATFORMS` is often a fallback emoji; the app prefers `getPlatformIcon`.

## 3. Library Implementation
- [ ] **Create Adapter:** Create `src/lib/social/<platform>.ts`.
    -   Implement `getAuthUrl()`.
    -   Implement `exchangeCodeForTokens()`.
    -   Implement `postContent()` (handle text/media constraints).
    -   Implement `getUserInfo()` (optional, for profile data).

## 4. Authentication Flow & Settings
- [ ] **API Route:** Create `src/app/api/auth/callback/<platform>/route.ts`.
    -   Use `exchangeCodeForTokens`.
    -   Upsert into `connected_accounts` table.
- [ ] **Settings Page:** Edit `src/app/settings/page.tsx`.
    -   Add a new `<div className={styles.platformGroup}>` section for the platform.
    -   Implement the "Connect" button pointing to `/api/auth/<platform>`.
    -   Handle "Connected" state display (username check) and "Disconnect" logic.

## 5. Global UI Integration
- [ ] **Search & Replace:** Grep for direct usages of `platform.icon` which might use the fallback emoji.
- [ ] **Update Components:** Ensure the following components use `getPlatformIcon(platform.id)`:
    -   `src/app/schedule/page.tsx` (Calendar platform filter/legend)
    -   `src/components/ai/AIComposeModal.tsx`
    -   `src/components/libraries/LibrarySettingsModal.tsx`
    -   `src/components/calendar/PostDetailPanel.tsx`
    -   `src/components/calendar/EditPostModal.tsx`
    -   `src/components/calendar/PostPopover.tsx`
- [ ] **Composer-Specifics:**
    -   Modify `src/components/composer/PostComposer.tsx` if special inputs are needed (e.g., Board selector, Title field).
    -   **Add Validation:**
        -   Does the platform require images? (e.g., Pinterest, Instagram)
        -   Does it strictly require text?
        -   Update `getDisabledReason` and `hasPlatformSpecificError` to enforce these rules.
        -   *Tip:* Use context7 (`/org/project/docs`) to find official validation rules for the platform API.

## 6. Verification
- [ ] **Connect:** Test the full OAuth connect flow.
- [ ] **Settings Check:** Verify the logo appears correctly in Settings without emojis in the header.
- [ ] **Post:** Publish a test post.
- [ ] **Verify UI:** Check the logo in the Calendar view, Post Details, and Composer platform selector.
