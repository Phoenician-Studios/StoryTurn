-- Owner tools to shift or swap readers across upcoming nights, and member tools
-- to pick random library books for upcoming nights. Each runs in one
-- transaction so a failure cannot leave readers half-shifted.

create or replace function public.pick_random_session_books(target_session_id uuid, book_count integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare fid uuid; picked integer;
begin
  select family_id into fid from public.reading_sessions where id = target_session_id;
  delete from public.session_books where session_id = target_session_id and book_id is not null;
  insert into public.session_books(session_id, book_id)
  select target_session_id, b.id from public.books b
  where b.family_id = fid order by random() limit book_count;
  get diagnostics picked = row_count;
  return picked;
end;
$$;
revoke all on function public.pick_random_session_books(uuid,integer) from public, authenticated;

create or replace function public.cascade_insert_reader(from_session_id uuid, fill_in_member_id uuid, book_count integer)
returns uuid[]
language plpgsql security definer set search_path = public as $$
declare
  fid uuid; sch public.schedules%rowtype; anchor public.reading_sessions%rowtype;
  night record; carried uuid; changed uuid[] := '{}'; last_day date; extra_day date;
  extra_id uuid; first boolean := true;
begin
  select family_id into fid from public.family_members where user_id = auth.uid() limit 1;
  if fid is null or not public.is_family_owner(fid) then raise exception 'Only family owners can manage readers'; end if;
  perform 1 from public.families where id = fid for update;
  if not exists(select 1 from public.family_members where id = fill_in_member_id and family_id = fid) then
    raise exception 'Fill-in reader must be in your family';
  end if;
  select * into anchor from public.reading_sessions where id = from_session_id and family_id = fid;
  if not found then raise exception 'Anchor session not found'; end if;
  if anchor.status <> 'scheduled' then raise exception 'Cascade only works on scheduled nights'; end if;
  if (anchor.scheduled_for at time zone 'UTC')::date < (now() at time zone 'UTC')::date then
    raise exception 'Cannot cascade from a past night';
  end if;
  select * into sch from public.schedules where family_id = fid and active order by created_at desc limit 1;
  if not found then raise exception 'Save a schedule before cascading'; end if;

  for night in
    select s.id, s.scheduled_for,
      (select a.member_id from public.session_assignments a
        where a.session_id = s.id and a.is_current order by a.created_at, a.id limit 1) as reader_id
    from public.reading_sessions s
    where s.family_id = fid and s.status = 'scheduled'
      and (s.scheduled_for at time zone 'UTC')::date >= (anchor.scheduled_for at time zone 'UTC')::date
    order by s.scheduled_for, s.id
  loop
    if first and night.id <> anchor.id then raise exception 'Anchor night must be the first night in the cascade'; end if;
    if night.reader_id is null then raise exception 'Night is missing a reader'; end if;
    update public.session_assignments set is_current = false where session_id = night.id;
    if exists(select 1 from public.session_assignments where session_id = night.id and member_id = coalesce(carried, fill_in_member_id)) then
      update public.session_assignments set is_current = true where session_id = night.id and member_id = coalesce(carried, fill_in_member_id);
    else
      insert into public.session_assignments(session_id, member_id, is_original, is_current)
      values(night.id, coalesce(carried, fill_in_member_id), false, true);
    end if;
    update public.reading_sessions set updated_at = now() where id = night.id;
    changed := changed || night.id;
    carried := night.reader_id;
    last_day := (night.scheduled_for at time zone 'UTC')::date;
    first := false;
  end loop;

  extra_day := last_day + 1;
  while exists(select 1 from public.reading_sessions where family_id = fid and (scheduled_for at time zone 'UTC')::date = extra_day) loop
    extra_day := extra_day + 1;
  end loop;
  insert into public.reading_sessions(family_id, schedule_id, scheduled_for, status, ics_uid)
  values(fid, sch.id, (extra_day + sch.time_local) at time zone 'UTC', 'scheduled',
    'storyturn-' || fid || '-' || extra_day || '@bedtime-readers.app')
  returning id into extra_id;
  insert into public.session_assignments(session_id, member_id, is_original, is_current)
  values(extra_id, carried, true, true);
  perform public.pick_random_session_books(extra_id, book_count);
  return changed || extra_id;
end;
$$;
revoke all on function public.cascade_insert_reader(uuid,uuid,integer) from public;
grant execute on function public.cascade_insert_reader(uuid,uuid,integer) to authenticated;

create or replace function public.swap_session_readers(session_a_id uuid, session_b_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid; a public.reading_sessions%rowtype; b public.reading_sessions%rowtype; reader_a uuid; reader_b uuid;
begin
  select family_id into fid from public.family_members where user_id = auth.uid() limit 1;
  if fid is null or not public.is_family_owner(fid) then raise exception 'Only family owners can manage readers'; end if;
  perform 1 from public.families where id = fid for update;
  select * into a from public.reading_sessions where id = session_a_id and family_id = fid;
  select * into b from public.reading_sessions where id = session_b_id and family_id = fid;
  if a.id is null or b.id is null then raise exception 'Both nights must belong to your family'; end if;
  if a.status <> 'scheduled' or b.status <> 'scheduled' then raise exception 'Only scheduled nights can be swapped'; end if;
  if least((a.scheduled_for at time zone 'UTC')::date, (b.scheduled_for at time zone 'UTC')::date) < (now() at time zone 'UTC')::date then
    raise exception 'Cannot swap past nights';
  end if;
  if a.id = b.id then raise exception 'Pick two different nights to swap'; end if;
  select member_id into reader_a from public.session_assignments where session_id = a.id and is_current order by created_at, id limit 1;
  select member_id into reader_b from public.session_assignments where session_id = b.id and is_current order by created_at, id limit 1;
  if reader_a is null or reader_b is null then raise exception 'Night is missing a reader'; end if;
  if reader_a = reader_b then raise exception 'Those nights already have the same reader'; end if;
  update public.session_assignments set is_current = false where session_id in (a.id, b.id);
  update public.session_assignments set is_current = true where session_id = a.id and member_id = reader_b;
  if not found then insert into public.session_assignments(session_id, member_id, is_original, is_current) values(a.id, reader_b, false, true); end if;
  update public.session_assignments set is_current = true where session_id = b.id and member_id = reader_a;
  if not found then insert into public.session_assignments(session_id, member_id, is_original, is_current) values(b.id, reader_a, false, true); end if;
  update public.reading_sessions set updated_at = now() where id in (a.id, b.id);
end;
$$;
revoke all on function public.swap_session_readers(uuid,uuid) from public;
grant execute on function public.swap_session_readers(uuid,uuid) to authenticated;

-- Without a target session, applies to every upcoming scheduled night in the
-- family's local calendar day; only_empty skips nights that already have
-- library books.
create or replace function public.pick_upcoming_session_books(target_session_id uuid default null, only_empty boolean default false, book_count integer default 3)
returns integer
language plpgsql security definer set search_path = public as $$
declare fid uuid; zone text; night public.reading_sessions%rowtype; updated integer := 0;
begin
  select family_id into fid from public.family_members where user_id = auth.uid() limit 1;
  if fid is null then raise exception 'Join a family first'; end if;
  if book_count is null or book_count < 1 then raise exception 'Invalid book count'; end if;
  if target_session_id is not null then
    select * into night from public.reading_sessions where id = target_session_id and family_id = fid;
    if not found then raise exception 'Session not found'; end if;
    if night.status <> 'scheduled' then raise exception 'Only scheduled nights can shuffle books'; end if;
    if (night.scheduled_for at time zone 'UTC')::date < (now() at time zone 'UTC')::date then
      raise exception 'Past nights cannot shuffle books; edit the session with a correction instead';
    end if;
  end if;
  if not exists(select 1 from public.books where family_id = fid) then
    raise exception 'Add books to the family library first';
  end if;
  if target_session_id is not null then
    perform public.pick_random_session_books(night.id, book_count);
    return 1;
  end if;
  select timezone into zone from public.schedules where family_id = fid and active order by created_at desc limit 1;
  for night in
    select * from public.reading_sessions s
    where s.family_id = fid and s.status = 'scheduled'
      and (s.scheduled_for at time zone 'UTC')::date >= (now() at time zone coalesce(zone, 'America/Los_Angeles'))::date
    order by s.scheduled_for
  loop
    if only_empty and exists(select 1 from public.session_books where session_id = night.id and book_id is not null) then
      continue;
    end if;
    perform public.pick_random_session_books(night.id, book_count);
    updated := updated + 1;
  end loop;
  return updated;
end;
$$;
revoke all on function public.pick_upcoming_session_books(uuid,boolean,integer) from public;
grant execute on function public.pick_upcoming_session_books(uuid,boolean,integer) to authenticated;
