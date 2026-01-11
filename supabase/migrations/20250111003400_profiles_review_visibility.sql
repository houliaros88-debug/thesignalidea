alter table public.profiles
  add column if not exists reviews_from_employees_enabled boolean not null default true,
  add column if not exists reviews_from_employers_enabled boolean not null default true,
  add column if not exists reviews_from_customers_enabled boolean not null default true;

update public.profiles
set reviews_from_employees_enabled = true
where reviews_from_employees_enabled is null;

update public.profiles
set reviews_from_employers_enabled = true
where reviews_from_employers_enabled is null;

update public.profiles
set reviews_from_customers_enabled = true
where reviews_from_customers_enabled is null;
