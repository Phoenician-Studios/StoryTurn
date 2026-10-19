create or replace function public.update_family_member_relation(target_id uuid, new_relation text)
returns void language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  select family_id into fid from public.family_members where user_id = auth.uid() limit 1;
  if fid is null or not public.is_family_owner(fid) then raise exception 'Only family owners can manage readers'; end if;
  if new_relation is null or new_relation not in ('parent','grandparent','aunt_uncle','sibling','caregiver','other') then raise exception 'Invalid relation'; end if;
  update public.family_members set relation_to_children = new_relation where id = target_id and family_id = fid;
  if not found then raise exception 'Reader not found'; end if;
end;
$$;
revoke all on function public.update_family_member_relation(uuid,text) from public;
grant execute on function public.update_family_member_relation(uuid,text) to authenticated;
