create table if not exists public.partner_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  title text,
  description text not null,
  image_url text,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists partner_listings_category_idx
  on public.partner_listings (category);

create index if not exists partner_listings_user_id_idx
  on public.partner_listings (user_id);

alter table public.partner_listings enable row level security;

create policy if not exists "Partner listings are public"
  on public.partner_listings
  for select
  using (true);

create policy if not exists "Authenticated can insert partner listings"
  on public.partner_listings
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their partner listings"
  on public.partner_listings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can delete their partner listings"
  on public.partner_listings
  for delete
  using (auth.uid() = user_id);

create or replace function public.enforce_partner_listing_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  business_count integer;
begin
  select count(*) into business_count
  from public.profiles
  where account_type = 'business';

  if business_count >= 2000 and (new.is_paid is distinct from true) then
    raise exception 'Payment required after the first 2000 business registrations.';
  end if;

  return new;
end;
$$;

drop trigger if exists partner_listings_enforce_quota
  on public.partner_listings;

create trigger partner_listings_enforce_quota
  before insert on public.partner_listings
  for each row execute function public.enforce_partner_listing_quota();
