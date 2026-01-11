drop policy if exists "Reviews are public" on public.reviews;

create policy "Authenticated can read reviews"
  on public.reviews
  for select
  using (auth.uid() is not null);
