-- Parent invitations and atomic family/schedule management.
alter table public.invite_codes add column role text not null default 'reader' check (role in ('owner','reader'));

create or replace function public.join_family(raw_code text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  invite public.invite_codes%rowtype;
  member_email text;
  clean_display text := trim(coalesce(display_name, ''));
  normalized text := public.normalize_invite_code(raw_code);
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if normalized = '' then
    raise exception 'Invalid invite code';
  end if;
  if exists (select 1 from public.family_members where user_id = uid) then
    raise exception 'Already in a family';
  end if;

  select * into invite
  from public.invite_codes
  where public.normalize_invite_code(code) = normalized
  for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;
  if invite.expires_at is not null and invite.expires_at < now() then
    raise exception 'Invite code has expired';
  end if;
  if invite.max_uses is not null and invite.uses >= invite.max_uses then
    raise exception 'Invite code has no uses left';
  end if;

  select email into member_email from auth.users where id = uid;
  if member_email is null or member_email = '' then
    raise exception 'Account email is missing';
  end if;
  if clean_display = '' then
    clean_display := split_part(member_email, '@', 1);
  end if;

  update public.invite_codes
  set uses = uses + 1
  where id = invite.id;

  insert into public.family_members (family_id, user_id, display_name, email, role)
  values (invite.family_id, uid, clean_display, member_email, invite.role);

  return invite.family_id;
end;
$$;

create or replace function public.update_family_member(target_id uuid, new_name text, new_role text)
returns void language plpgsql security definer set search_path = public as $$
declare fid uuid; target public.family_members%rowtype;
begin
  select family_id into fid from public.family_members where user_id = auth.uid() limit 1;
  if fid is null or not public.is_family_owner(fid) then raise exception 'Only family owners can manage readers'; end if;
  -- Serialize role changes so concurrent demotions cannot remove every parent.
  perform 1 from public.families where id = fid for update;
  select * into target from public.family_members where id = target_id and family_id = fid;
  if not found then raise exception 'Reader not found'; end if;
  if trim(coalesce(new_name,'')) = '' or new_role not in ('owner','reader') or new_role is null then raise exception 'Invalid name or role'; end if;
  if target.role = 'owner' and new_role <> 'owner' and (select count(*) from public.family_members where family_id = fid and role = 'owner') = 1 then raise exception 'Cannot demote the last parent'; end if;
  update public.family_members set display_name = trim(new_name), role = new_role where id = target_id;
end;
$$;
revoke all on function public.update_family_member(uuid,text,text) from public;
grant execute on function public.update_family_member(uuid,text,text) to authenticated;

create or replace function public.manage_schedule(rotation_ids uuid[] default null, starts_on date default null, bedtime time default null, zone text default null, timing text default 'after', deleting boolean default false)
returns table(session_id uuid, cancelled boolean)
language plpgsql security definer set search_path = public as $$
declare fid uuid; sch public.schedules%rowtype; night public.reading_sessions%rowtype; day date; reader_id uuid; today date;
begin
  select family_id into fid from public.family_members where user_id = auth.uid() limit 1;
  if fid is null or not public.is_family_owner(fid) then raise exception 'Only family owners can manage schedules'; end if;
  perform 1 from public.families where id = fid for update;
  select * into sch from public.schedules where family_id = fid order by active desc, created_at desc limit 1;
  today := (now() at time zone coalesce(sch.timezone, 'UTC'))::date;
  if deleting then
    update public.schedules set active = false where family_id = fid and active;
    for night in select s.* from public.reading_sessions s join public.schedules sc on sc.id = s.schedule_id where sc.family_id = fid and s.status = 'scheduled' and (s.scheduled_for at time zone 'UTC')::date >= today loop
      update public.reading_sessions set status = 'cancelled', updated_at = now() where id = night.id;
      session_id := night.id; cancelled := true; return next;
    end loop;
    return;
  end if;
  if coalesce(cardinality(rotation_ids),0) = 0 or exists(select 1 from unnest(rotation_ids) r where r is null or not exists(select 1 from public.family_members m where m.id = r and m.family_id = fid)) then raise exception 'Pick valid family readers'; end if;
  if starts_on is null or bedtime is null or zone is null or not exists(select 1 from pg_timezone_names where name = zone) or timing not in ('ahead','after') or timing is null then raise exception 'Invalid schedule settings'; end if;
  today := (now() at time zone zone)::date;
  if sch.id is null then
    insert into public.schedules(family_id,reader_rotation_member_ids,start_date,time_local,timezone,book_timing) values(fid,rotation_ids,starts_on,bedtime,zone,timing);
    return;
  end if;
  update public.schedules set active = true, reader_rotation_member_ids = rotation_ids, start_date = starts_on, time_local = bedtime, timezone = zone, book_timing = timing where id = sch.id;
  for night in select * from public.reading_sessions s where s.schedule_id = sch.id and (s.status = 'scheduled' or (not sch.active and s.status = 'cancelled')) and (s.scheduled_for at time zone 'UTC')::date >= today loop
    day := (night.scheduled_for at time zone 'UTC')::date;
    if day < starts_on then
      update public.reading_sessions set status = 'cancelled', updated_at = now() where id = night.id;
      cancelled := true;
    else
      reader_id := rotation_ids[1 + ((day - starts_on) % cardinality(rotation_ids))];
      update public.reading_sessions set status = 'scheduled', scheduled_for = (day + bedtime) at time zone 'UTC', updated_at = now() where id = night.id;
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
revoke all on function public.manage_schedule(uuid[],date,time,text,text,boolean) from public;
grant execute on function public.manage_schedule(uuid[],date,time,text,text,boolean) to authenticated;
