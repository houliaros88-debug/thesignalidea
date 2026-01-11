create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_sender_idx
  on public.messages (sender_id, created_at desc);

create index if not exists messages_recipient_idx
  on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "Users can read their messages" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Users can update received messages" on public.messages;

create policy "Users can read their messages"
  on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send messages"
  on public.messages
  for insert
  with check (auth.uid() = sender_id);

create policy "Users can update received messages"
  on public.messages
  for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
