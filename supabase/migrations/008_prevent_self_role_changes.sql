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
  if target.user_id = auth.uid() and new_role <> target.role then raise exception 'Cannot change your own role'; end if;
  if target.role = 'owner' and new_role <> 'owner' and (select count(*) from public.family_members where family_id = fid and role = 'owner') = 1 then raise exception 'Cannot demote the last parent'; end if;
  update public.family_members set display_name = trim(new_name), role = new_role where id = target_id;
end;
$$;
revoke all on function public.update_family_member(uuid,text,text) from public;
grant execute on function public.update_family_member(uuid,text,text) to authenticated;
