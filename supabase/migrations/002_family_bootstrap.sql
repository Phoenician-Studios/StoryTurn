-- Bootstrap RPCs and RLS fixes for live Supabase auth.
-- is_family_member must be security definer or policies that call it recurse.

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members m
    where m.family_id = fid
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_family_owner(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members m
    where m.family_id = fid
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

create or replace function public.normalize_invite_code(raw text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.create_family(family_name text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fid uuid;
  member_email text;
  clean_name text := trim(coalesce(family_name, ''));
  clean_display text := trim(coalesce(display_name, ''));
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if clean_name = '' then
    raise exception 'Family name is required';
  end if;
  if exists (select 1 from public.family_members where user_id = uid) then
    raise exception 'Already in a family';
  end if;

  select email into member_email from auth.users where id = uid;
  if member_email is null or member_email = '' then
    raise exception 'Account email is missing';
  end if;
  if clean_display = '' then
    clean_display := split_part(member_email, '@', 1);
  end if;

  insert into public.families (name, created_by)
  values (clean_name, uid)
  returning id into fid;

  insert into public.family_members (family_id, user_id, display_name, email, role)
  values (fid, uid, clean_display, member_email, 'owner');

  return fid;
end;
$$;

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
  values (invite.family_id, uid, clean_display, member_email, 'reader');

  return invite.family_id;
end;
$$;

revoke all on function public.is_family_member(uuid) from public;
revoke all on function public.is_family_owner(uuid) from public;
revoke all on function public.create_family(text, text) from public;
revoke all on function public.join_family(text, text) from public;

grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_owner(uuid) to authenticated;
grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;

drop policy if exists "members manage schedules" on public.schedules;
create policy "members read schedules" on public.schedules
  for select using (public.is_family_member(family_id));
create policy "owners insert schedules" on public.schedules
  for insert with check (public.is_family_owner(family_id));
create policy "owners update schedules" on public.schedules
  for update using (public.is_family_owner(family_id))
  with check (public.is_family_owner(family_id));

drop policy if exists "members manage kids" on public.kids;
create policy "members read kids" on public.kids
  for select using (public.is_family_member(family_id));
create policy "owners insert kids" on public.kids
  for insert with check (public.is_family_owner(family_id));
create policy "owners update kids" on public.kids
  for update using (public.is_family_owner(family_id))
  with check (public.is_family_owner(family_id));
create policy "owners delete kids" on public.kids
  for delete using (public.is_family_owner(family_id));

drop policy if exists "members manage invites" on public.invite_codes;
create policy "members read invites" on public.invite_codes
  for select using (public.is_family_member(family_id));
create policy "owners insert invites" on public.invite_codes
  for insert with check (public.is_family_owner(family_id));
create policy "owners update invites" on public.invite_codes
  for update using (public.is_family_owner(family_id))
  with check (public.is_family_owner(family_id));
