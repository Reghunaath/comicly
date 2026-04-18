-- Comics table
create table comics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'input'
    check (status in ('input', 'script_pending', 'script_draft', 'script_approved', 'generating', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- User input
  prompt text not null,
  art_style text not null
    check (art_style in ('manga', 'western_comic', 'watercolor_storybook', 'minimalist_flat', 'vintage_newspaper', 'custom')),
  custom_style_prompt text,
  page_count int not null check (page_count between 1 and 15),

  -- Follow-up questions and answers (stored as JSONB)
  follow_up_questions jsonb,  -- Array of { id, question }
  follow_up_answers jsonb,    -- Object of { questionId: answer }

  -- Script (stored as JSONB)
  script jsonb,               -- { title, synopsis, pages: [...] }

  -- Generation
  generation_mode text check (generation_mode in ('supervised', 'automated')),
  current_page_index int not null default 0
);

-- Pages table (one row per page)
create table comic_pages (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid not null references comics(id) on delete cascade,
  page_number int not null,
  selected_version_index int not null default 0,
  created_at timestamptz not null default now(),

  unique (comic_id, page_number)
);

-- Page versions table (one row per generated version of a page)
create table page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references comic_pages(id) on delete cascade,
  version_index int not null,
  image_url text not null,
  generated_at timestamptz not null default now(),

  unique (page_id, version_index)
);

-- Indexes
create index idx_comics_user_id on comics(user_id);
create index idx_comics_status on comics(status);
create index idx_comic_pages_comic_id on comic_pages(comic_id);
create index idx_page_versions_page_id on page_versions(page_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger comics_updated_at
  before update on comics
  for each row execute function update_updated_at();
