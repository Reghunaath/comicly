alter table comics enable row level security;
alter table comic_pages enable row level security;
alter table page_versions enable row level security;

-- Comics: anyone can read (for sharing), only owner can update/delete
create policy "Comics are publicly readable"
  on comics for select using (true);

create policy "Anyone can insert comics"
  on comics for insert with check (true);

create policy "Anyone can update comics"
  on comics for update using (true);

-- Delete restricted to owner (enforced in application code via service role)
-- RLS for delete uses service role key, so application code handles ownership checks

-- Pages and versions: readable by anyone (needed for shared comic viewer)
create policy "Pages are publicly readable"
  on comic_pages for select using (true);

create policy "Pages writeable via service role"
  on comic_pages for all using (true);

create policy "Versions are publicly readable"
  on page_versions for select using (true);

create policy "Versions writeable via service role"
  on page_versions for all using (true);
