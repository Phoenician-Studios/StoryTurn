-- Supabase grants execute on public functions to anon directly. None of these
-- RPCs are meant for signed-out callers, so only authenticated (and
-- service_role, which keeps its grants) can run them.
--
-- Left callable by anon on purpose:
-- - is_family_member / is_family_owner: RLS policies call them, so revoking
--   would turn signed-out table reads into permission errors.
-- - normalize_invite_code: pure text helper with no data access.
-- - Trigger functions, which cannot be called directly.
revoke execute on function
  public.cascade_insert_reader(uuid, uuid, integer),
  public.correct_book_format(uuid, text),
  public.create_family(text, text, text),
  public.finish_book_scan(uuid),
  public.generate_schedule_night(uuid, date),
  public.join_family(text, text, text),
  public.manage_schedule(uuid[], date, time, text, text, boolean, integer, boolean),
  public.pick_upcoming_session_books(uuid, boolean, integer),
  public.remove_library_books(uuid[], uuid),
  public.reserve_book_lookup(),
  public.save_book_edition(jsonb, uuid),
  public.start_book_scan(),
  public.swap_session_readers(uuid, uuid),
  public.update_family_member(uuid, text, text),
  public.update_family_member_relation(uuid, text)
from anon;

-- Deployed migration 010 (not in this repo) added the wishlist RPCs.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.save_family_book(text,text[],text,text,text,text)',
    'public.move_wishlist_book(uuid)',
    'public.remove_wishlist_book(uuid)'
  ] loop
    if to_regprocedure(fn) is not null then
      execute format('revoke execute on function %s from anon', fn);
    end if;
  end loop;
end;
$$;
