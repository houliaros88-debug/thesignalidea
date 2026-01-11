create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references auth.users (id) on delete cascade,
  review_type text not null
    check (review_type in ('employee_to_business', 'business_to_employee')),
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null,
  role text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  constraint reviews_reviewer_subject_type_unique unique (reviewer_id, subject_id, review_type),
  constraint reviews_not_self check (reviewer_id <> subject_id)
);

create index if not exists reviews_review_type_idx
  on public.reviews (review_type);

create index if not exists reviews_subject_idx
  on public.reviews (subject_id);

alter table public.reviews enable row level security;

create policy "Reviews are public"
  on public.reviews
  for select
  using (true);

create policy "Employees can review businesses"
  on public.reviews
  for insert
  with check (
    auth.uid() = reviewer_id
    and review_type = 'employee_to_business'
    and exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = auth.uid()
        and reviewer.account_type = 'private'
    )
    and exists (
      select 1
      from public.profiles subject
      where subject.id = subject_id
        and subject.account_type = 'business'
    )
  );

create policy "Businesses can review employees"
  on public.reviews
  for insert
  with check (
    auth.uid() = reviewer_id
    and review_type = 'business_to_employee'
    and exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = auth.uid()
        and reviewer.account_type = 'business'
    )
    and exists (
      select 1
      from public.profiles subject
      where subject.id = subject_id
        and subject.account_type = 'private'
    )
  );
