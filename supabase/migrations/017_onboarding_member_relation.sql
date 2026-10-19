-- Store the relation picked during onboarding. The two-argument versions are
-- dropped so existing callers resolve to these without overload ambiguity.

drop function if exists public.create_family(text, text);
drop function if exists public.join_family(text, text);

create function public.create_family(family_name text, display_name text, relation text default 'parent')
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
  if relation is null or relation not in ('parent','grandparent','aunt_uncle','sibling','caregiver','other') then
    raise exception 'Invalid relation';
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

  insert into public.family_members (family_id, user_id, display_name, email, role, relation_to_children)
  values (fid, uid, clean_display, member_email, 'owner', relation);

  return fid;
end;
$$;

create function public.join_family(raw_code text, display_name text, relation text default 'other')
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
  if relation is null or relation not in ('parent','grandparent','aunt_uncle','sibling','caregiver','other') then
    raise exception 'Invalid relation';
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

  insert into public.family_members (family_id, user_id, display_name, email, role, relation_to_children)
  values (invite.family_id, uid, clean_display, member_email, invite.role, relation);

  return invite.family_id;
end;
$$;

revoke all on function public.create_family(text, text, text) from public;
revoke all on function public.join_family(text, text, text) from public;
grant execute on function public.create_family(text, text, text) to authenticated;
grant execute on function public.join_family(text, text, text) to authenticated;
