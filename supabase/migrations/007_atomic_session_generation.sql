-- Keep generated nights complete and serialize generation with schedule edits.
create function public.generate_schedule_night(target_schedule_id uuid, night_date date)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  sch public.schedules%rowtype;
  new_session_id uuid;
  reader_id uuid;
begin
  select * into sch from public.schedules where id = target_schedule_id for update;
  if not found or not sch.active then return null; end if;
  if night_date is null or night_date < sch.start_date or coalesce(cardinality(sch.reader_rotation_member_ids), 0) = 0 then
    raise exception 'Invalid schedule night';
  end if;
  -- Existing nights, including individual cancellations, keep their selections.
  if exists(select 1 from public.reading_sessions where schedule_id = sch.id and (scheduled_for at time zone 'UTC')::date = night_date) then
    return null;
  end if;
  reader_id := sch.reader_rotation_member_ids[1 + ((night_date - sch.start_date) % cardinality(sch.reader_rotation_member_ids))];
  if not exists(select 1 from public.family_members where id = reader_id and family_id = sch.family_id) then
    raise exception 'Invalid reader in rotation';
  end if;
  insert into public.reading_sessions(family_id, schedule_id, scheduled_for, status, ics_uid)
  values(sch.family_id, sch.id, (night_date + sch.time_local) at time zone 'UTC', 'scheduled',
    'storyturn-' || sch.family_id || '-' || night_date || '@bedtime-readers.app')
  on conflict (ics_uid) do nothing returning id into new_session_id;
  if new_session_id is null then return null; end if;
  insert into public.session_assignments(session_id, member_id, is_original, is_current)
  values(new_session_id, reader_id, true, true);
  if sch.assign_random_books then
    -- Lock selected books until commit so concurrent deletion cannot invalidate picks.
    with picks as materialized (
      select id from public.books where family_id = sch.family_id
      order by random() limit sch.books_per_session for key share
    )
    insert into public.session_books(session_id, book_id)
    select new_session_id, id from picks;
  end if;
  return new_session_id;
end;
$$;
revoke all on function public.generate_schedule_night(uuid,date) from public;
grant execute on function public.generate_schedule_night(uuid,date) to authenticated, service_role;
