-- Replace prior work-only uniqueness with edition identity, preserving wishlist data.
drop index if exists public.books_family_work_key;
-- Legacy ISBNs came from arbitrary work search results. Preserve them and all
-- references, but do not silently promote them to authoritative edition identity.
alter table public.books add column edition_key text,
  add column normalized_isbn text, add column format text,
  add column publisher text, add column edition_year text;
create unique index books_family_isbn on public.books(family_id, normalized_isbn) where normalized_isbn is not null;
create unique index books_family_edition on public.books(family_id, edition_key) where edition_key is not null;
create table public.book_scan_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.family_members(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '4 hours',
  closed boolean not null default false
);
alter table public.book_scan_sessions enable row level security;
alter table public.books add column scan_session_id uuid references public.book_scan_sessions(id) on delete set null;
-- RPCs derive the family and scan ownership from auth.uid(), never client input.
create function public.start_book_scan() returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid; sid uuid;
begin
  select id into mid from family_members where user_id=auth.uid() limit 1;
  if mid is null then raise exception 'Join a family first'; end if;
  perform 1 from family_members where id=mid for no key update;
  update book_scan_sessions set closed=true where member_id=mid and not closed;
  delete from book_scan_sessions where expires_at < now() - interval '1 day';
  insert into book_scan_sessions(member_id) values(mid) returning id into sid;
  return sid;
end; $$;
create function public.finish_book_scan(scan_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update book_scan_sessions s set closed=true from family_members m where s.id=scan_id and s.member_id=m.id and m.user_id=auth.uid();
end; $$;
create function public.save_book_edition(metadata jsonb, scan_id uuid default null)
returns table(book jsonb, created boolean) language plpgsql security definer set search_path = public as $$
declare fid uuid; saved public.books%rowtype; code text; edition text;
begin
  select family_id into fid from family_members where user_id=auth.uid() limit 1;
  if fid is null then raise exception 'Join a family first'; end if;
  -- Serialize family saves; unique indexes also protect direct writes.
  perform pg_advisory_xact_lock(hashtextextended(fid::text, 0));
  perform 1 from families f where f.id=fid for no key update;
  if scan_id is not null then
    perform 1 from book_scan_sessions s join family_members m on m.id=s.member_id where s.id=scan_id and m.user_id=auth.uid() and not s.closed and s.expires_at>now() for update of s;
    if not found then raise exception 'Scan session ended'; end if;
  end if;
  code := nullif(metadata->>'isbn',''); edition := nullif(metadata->>'editionKey','');
  if edition is null or edition !~ '^/books/OL[0-9]+M$' or coalesce(length(metadata->>'title'),0)=0 or length(metadata->>'title')>500 then raise exception 'Invalid edition'; end if;
  if code is not null and (code !~ '^97[89][0-9]{10}$' or (select sum(substr(code,i,1)::integer * case when i%2=0 then 3 else 1 end)%10 from generate_series(1,13) i)<>0) then raise exception 'Invalid ISBN'; end if;
  select * into saved from books b where b.family_id=fid and ((code is not null and b.normalized_isbn=code) or b.edition_key=edition) order by (b.normalized_isbn=code) desc nulls last limit 1;
  if saved.id is not null then book:=to_jsonb(saved); created:=false; return next; return; end if;
  insert into books(family_id,title,authors,open_library_key,cover_url,isbn,normalized_isbn,edition_key,format,publisher,edition_year,scan_session_id)
  values(fid,metadata->>'title',array(select jsonb_array_elements_text(metadata->'authors')),nullif(metadata->>'openLibraryKey',''),nullif(metadata->>'coverUrl',''),code,code,edition,nullif(metadata->>'format',''),nullif(metadata->>'publisher',''),nullif(metadata->>'editionYear',''),scan_id) returning * into saved;
  book:=to_jsonb(saved); created:=true; return next;
end; $$;
create function public.remove_library_books(book_ids uuid[], scan_id uuid default null)
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
      -- Retried deletion is successful without exposing a foreign book.
      if not exists(select 1 from books b where b.id=bid) then status:='removed'; end if;
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
create function public.correct_book_format(book_id uuid, label text) returns void language plpgsql security definer set search_path = public as $$
begin
  if length(trim(label))=0 or length(label)>80 then raise exception 'Enter a format up to 80 characters'; end if;
  update books set format=trim(label) where id=book_id and public.is_family_member(family_id) and nullif(trim(format),'') is null;
  if not found then raise exception 'Book unavailable or format already set'; end if;
end; $$;
-- Shared request pacing across application instances. Conservative unidentified
-- provider budget: one request each 1.1s; reject rather than build a long backlog.
create table public.book_lookup_budget(id boolean primary key default true check(id), next_at timestamptz not null);
insert into public.book_lookup_budget values(true,now());
alter table public.book_lookup_budget enable row level security;
create function public.reserve_book_lookup() returns integer language plpgsql security definer set search_path = public as $$
declare next_slot timestamptz;
begin
  if not exists(select 1 from family_members where user_id=auth.uid()) then raise exception 'Join a family first'; end if;
  select greatest(next_at,clock_timestamp()) into next_slot from book_lookup_budget where id for update;
  if next_slot>clock_timestamp()+interval '15 seconds' then raise exception 'Book lookup busy'; end if;
  update book_lookup_budget set next_at=next_slot+interval '1100 milliseconds' where id;
  return greatest(0,ceil(extract(epoch from (next_slot-clock_timestamp()))*1000)::integer);
end; $$;
revoke all on function public.start_book_scan(), public.finish_book_scan(uuid), public.save_book_edition(jsonb,uuid), public.remove_library_books(uuid[],uuid), public.correct_book_format(uuid,text), public.reserve_book_lookup() from public;
grant execute on function public.start_book_scan(), public.finish_book_scan(uuid), public.save_book_edition(jsonb,uuid), public.remove_library_books(uuid[],uuid), public.correct_book_format(uuid,text), public.reserve_book_lookup() to authenticated;

-- Edition/scan ownership must only be changed through the authorized RPCs.
revoke insert, update on public.books from authenticated, anon;
-- Preserve legacy wishlist promotion without allowing callers to forge scan ownership.
grant insert(family_id,title,authors,open_library_key,cover_url,isbn),
  update(title,authors,open_library_key,cover_url,isbn) on public.books to authenticated;
