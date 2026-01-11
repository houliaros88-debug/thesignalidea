create table if not exists public.job_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  title text not null,
  description text not null,
  location text,
  contact text,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists job_listings_category_idx
  on public.job_listings (category);

create index if not exists job_listings_user_id_idx
  on public.job_listings (user_id);

alter table public.job_listings enable row level security;

create policy "Job listings are public"
  on public.job_listings
  for select
  using (true);

create policy "Business accounts can insert job listings"
  on public.job_listings
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.account_type = 'business'
    )
  );

create policy "Users can update their job listings"
  on public.job_listings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their job listings"
  on public.job_listings
  for delete
  using (auth.uid() = user_id);
