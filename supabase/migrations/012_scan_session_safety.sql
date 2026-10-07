-- Keep active scans independent across tabs and avoid cross-family existence leaks.
create or replace function public.start_book_scan() returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid; sid uuid;
begin
  select id into mid from family_members where user_id=auth.uid() limit 1;
  if mid is null then raise exception 'Join a family first'; end if;
  perform 1 from family_members where id=mid for no key update;
  delete from book_scan_sessions where expires_at < now() - interval '1 day';
  insert into book_scan_sessions(member_id) values(mid) returning id into sid;
  return sid;
end; $$;
create or replace function public.remove_library_books(book_ids uuid[], scan_id uuid default null)
returns table(id uuid, status text) language plpgsql security definer set search_path = public as $$
declare fid uuid; bid uuid; saved public.books%rowtype;
begin
  select family_id into fid from family_members where user_id=auth.uid() limit 1;
  if fid is null then raise exception 'Join a family first'; end if;
  perform pg_advisory_xact_lock(hashtextextended(fid::text, 0));
  perform 1 from families f where f.id=fid for no key update;
  if coalesce(cardinality(book_ids),0)>100 then raise exception 'Select at most 100 books'; end if;
  if scan_id is not null then
    perform 1 from book_scan_sessions s join family_members m on m.id=s.member_id where s.id=scan_id and m.user_id=auth.uid() and not s.closed and s.expires_at>now() for update of s;
    if not found then raise exception 'Scan session ended'; end if;
  end if;
  for bid in select distinct unnest(book_ids) order by 1 loop
    id:=bid; status:='unavailable';
    select * into saved from books b where b.id=bid and b.family_id=fid for update;
    if saved.id is null then
      -- Foreign and absent IDs are indistinguishable, including repeat deletion.
      status:='removed';
    elsif scan_id is null or saved.scan_session_id=scan_id then
      if exists(select 1 from session_books sb where sb.book_id=bid) then status:='referenced';
      else
        begin
          delete from books b where b.id=bid; status:='removed';
        exception when foreign_key_violation then status:='referenced'; end;
      end if;
    end if;
    return next;
  end loop;
end; $$;
