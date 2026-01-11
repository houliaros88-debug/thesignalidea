drop policy if exists "Employees can review businesses" on public.reviews;
drop policy if exists "Businesses can review employees" on public.reviews;
drop policy if exists "Customers can review employees" on public.reviews;

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
        and subject.reviews_enabled = true
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
        and subject.reviews_enabled = true
    )
  );

create policy "Customers can review employees"
  on public.reviews
  for insert
  with check (
    auth.uid() = reviewer_id
    and review_type = 'customer_to_employee'
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
        and subject.account_type = 'private'
        and subject.reviews_enabled = true
    )
  );
