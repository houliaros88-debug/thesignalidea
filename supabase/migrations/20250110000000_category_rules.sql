-- Category rules for free quota and competition threshold.

create table if not exists public.category_rules (
  category text primary key,
  free_quota integer not null default 1000,
  competition_threshold integer not null default 40000,
  prize_amount_eur integer not null default 150000,
  competition_started_at timestamp with time zone
);

alter table public.category_rules enable row level security;

create policy "Category rules are readable"
on public.category_rules
for select
using (true);

alter table public.ideas
add column if not exists is_paid boolean not null default false;

insert into public.category_rules (category)
values
  ('Food & Drinks'),
  ('Fashion'),
  ('Technology'),
  ('Lifestyle & Wellness')
on conflict (category) do nothing;

create or replace function public.enforce_category_quota()
returns trigger as $$
declare
  rule record;
  idea_count integer;
begin
  select * into rule
  from public.category_rules
  where category = new.category;

  if not found then
    raise exception 'Unknown category: %', new.category;
  end if;

  select count(*) into idea_count
  from public.ideas
  where category = new.category;

  if idea_count >= rule.free_quota and new.is_paid is not true then
    raise exception 'Payment required after the first % ideas in this category.', rule.free_quota;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists ideas_enforce_category_quota on public.ideas;
create trigger ideas_enforce_category_quota
before insert on public.ideas
for each row
execute function public.enforce_category_quota();

create or replace function public.start_competition_if_ready()
returns trigger as $$
declare
  rule record;
  idea_count integer;
begin
  select * into rule
  from public.category_rules
  where category = new.category;

  if not found then
    return new;
  end if;

  select count(*) into idea_count
  from public.ideas
  where category = new.category;

  if idea_count >= rule.competition_threshold
    and rule.competition_started_at is null then
    update public.category_rules
    set competition_started_at = now()
    where category = new.category
      and competition_started_at is null;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists ideas_start_competition on public.ideas;
create trigger ideas_start_competition
after insert on public.ideas
for each row
execute function public.start_competition_if_ready();
