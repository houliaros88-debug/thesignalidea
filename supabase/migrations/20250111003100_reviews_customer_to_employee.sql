alter table public.reviews
  drop constraint if exists reviews_review_type_check;

alter table public.reviews
  add constraint reviews_review_type_check
  check (
    review_type in (
      'employee_to_business',
      'business_to_employee',
      'customer_to_employee'
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
    )
  );
