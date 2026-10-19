-- Replace static age with birthday for kids.
-- Safe no-op path for fresh installs that already used 001 with birthday:
-- only runs the age→birthday reshape when the legacy column still exists.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'kids'
      and column_name = 'age'
  ) then
    alter table public.kids add column if not exists birthday date;

    update public.kids
    set birthday = (current_date - make_interval(years => age))::date
    where birthday is null;

    alter table public.kids alter column birthday set not null;
    alter table public.kids drop column age;
    alter table public.kids
      add constraint kids_birthday_not_future check (birthday <= current_date);
  end if;
end $$;
