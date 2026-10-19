-- Supabase grants execute on new public functions to anon directly, so the
-- revoke from public in 018 left this unchecked helper callable without auth.
revoke all on function public.pick_random_session_books(uuid,integer) from anon, authenticated;
