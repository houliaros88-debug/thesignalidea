alter table public.profiles
  add column if not exists reviews_enabled boolean not null default true;

update public.profiles
set reviews_enabled = true
where reviews_enabled is null;
