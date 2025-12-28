-- Content Libraries (Categories)
create table if not exists content_libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  color text default '#6366f1',
  is_paused boolean default false,
  auto_remix boolean default false,
  created_at timestamptz default now()
);

-- Weekly Posting Slots
create table if not exists weekly_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  library_id uuid references content_libraries on delete cascade not null,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  time_of_day time not null,
  platform_ids text[] not null, -- Array of platform IDs like ['twitter', 'linkedin']
  created_at timestamptz default now()
);

-- Add Columns to Posts
alter table posts
add column if not exists library_id uuid references content_libraries on delete set null,
add column if not exists is_evergreen boolean default false,
add column if not exists last_published_at timestamptz;

-- RLS Policies
alter table content_libraries enable row level security;
alter table weekly_slots enable row level security;

create policy "Users can CRUD own libraries" on content_libraries
  for all using (auth.uid() = user_id);

create policy "Users can CRUD own slots" on weekly_slots
  for all using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_content_libraries_user_id on content_libraries(user_id);
create index if not exists idx_weekly_slots_user_id on weekly_slots(user_id);
create index if not exists idx_posts_library_id on posts(library_id);
create index if not exists idx_posts_is_evergreen on posts(is_evergreen) where is_evergreen = true;
