-- Avoid a family/schedule deadlock between schedule editing and night generation.
create or replace function public.manage_schedule(rotation_ids uuid[] default null, starts_on date default null, bedtime time default null, zone text default null, timing text default 'after', deleting boolean default false, book_count integer default 1, random_books boolean default false)
returns table(session_id uuid, cancelled boolean, removed_member_ids uuid[], previous_scheduled_for timestamptz)
language plpgsql security definer set search_path = public as $$
declare fid uuid; sch public.schedules%rowtype; night public.reading_sessions%rowtype; day date; reader_id uuid; today date; previous_readers uuid[];
begin
  select family_id into fid from public.family_members where user_id = auth.uid() limit 1;
  if fid is null or not public.is_family_owner(fid) then raise exception 'Only family owners can manage schedules'; end if;
  -- Serialize edits without blocking generation foreign-key KEY SHARE locks.
  perform 1 from public.families where id = fid for no key update;
  select * into sch from public.schedules where family_id = fid order by active desc, created_at desc limit 1;
  today := (now() at time zone coalesce(sch.timezone, 'UTC'))::date;
  if deleting then
    update public.schedules set active = false where family_id = fid and active;
    for night in select s.* from public.reading_sessions s join public.schedules sc on sc.id = s.schedule_id where sc.family_id = fid and s.status = 'scheduled' and (s.scheduled_for at time zone 'UTC')::date >= today loop
      update public.reading_sessions set status = 'cancelled', cancellation_source = 'schedule', updated_at = now() where id = night.id;
      select coalesce(array_agg(a.member_id), '{}') into removed_member_ids from public.session_assignments a where a.session_id = night.id and a.is_current;
      previous_scheduled_for := night.scheduled_for;
      session_id := night.id; cancelled := true; return next;
    end loop;
    return;
  end if;
  if coalesce(cardinality(rotation_ids),0) = 0 or exists(select 1 from unnest(rotation_ids) r where r is null or not exists(select 1 from public.family_members m where m.id = r and m.family_id = fid)) then raise exception 'Pick valid family readers'; end if;
  if starts_on is null or bedtime is null or zone is null or not exists(select 1 from pg_timezone_names where name = zone) or timing not in ('ahead','after') or timing is null then raise exception 'Invalid schedule settings'; end if;
  if book_count is null or book_count < 1 or random_books is null then raise exception 'Invalid book settings'; end if;
  today := (now() at time zone zone)::date;
  if sch.id is null then
    insert into public.schedules(family_id,reader_rotation_member_ids,start_date,time_local,timezone,book_timing,books_per_session,assign_random_books) values(fid,rotation_ids,starts_on,bedtime,zone,timing,book_count,random_books);
    return;
  end if;
  update public.schedules set active = true, reader_rotation_member_ids = rotation_ids, start_date = starts_on, time_local = bedtime, timezone = zone, book_timing = timing, books_per_session = book_count, assign_random_books = random_books where id = sch.id;
  for night in select * from public.reading_sessions s where s.schedule_id = sch.id and (s.status = 'scheduled' or (s.status = 'cancelled' and s.cancellation_source = 'schedule')) and (s.scheduled_for at time zone 'UTC')::date >= today loop
    day := (night.scheduled_for at time zone 'UTC')::date;
    previous_scheduled_for := night.scheduled_for;
    select coalesce(array_agg(a.member_id), '{}') into previous_readers from public.session_assignments a where a.session_id = night.id and a.is_current;
    removed_member_ids := '{}';
    if day < starts_on then
      if night.status = 'cancelled' then continue; end if;
      removed_member_ids := previous_readers;
      update public.reading_sessions set status = 'cancelled', cancellation_source = 'schedule', updated_at = now() where id = night.id;
      cancelled := true;
    else
      reader_id := rotation_ids[1 + ((day - starts_on) % cardinality(rotation_ids))];
      if night.status = 'scheduled' then
        select coalesce(array_agg(r), '{}') into removed_member_ids from unnest(previous_readers) r where r <> reader_id;
      end if;
      update public.reading_sessions set status = 'scheduled', cancellation_source = null, scheduled_for = (day + bedtime) at time zone 'UTC', updated_at = now() where id = night.id;
      update public.session_assignments set is_current = false where session_assignments.session_id = night.id;
      if exists(select 1 from public.session_assignments a where a.session_id = night.id and a.member_id = reader_id) then
        update public.session_assignments set is_current = true where session_assignments.session_id = night.id and member_id = reader_id;
      else
        insert into public.session_assignments(session_id,member_id,is_original,is_current) values(night.id,reader_id,false,true);
      end if;
      cancelled := false;
    end if;
    session_id := night.id; return next;
  end loop;
end;
$$;
revoke all on function public.manage_schedule(uuid[],date,time,text,text,boolean,integer,boolean) from public;
grant execute on function public.manage_schedule(uuid[],date,time,text,text,boolean,integer,boolean) to authenticated;
