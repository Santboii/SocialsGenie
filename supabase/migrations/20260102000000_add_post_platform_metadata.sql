-- Add metadata column to post_platforms to store platform-specific data (like Pinterest board_id)
alter table post_platforms
add column if not exists metadata jsonb default '{}'::jsonb;
