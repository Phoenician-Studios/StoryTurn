alter table public.reading_sessions
  add column calendar_sequence integer not null default 0 check (calendar_sequence >= 0);

-- Previously sent cancellations used sequence 1. Start existing UIDs at that
-- revision so their next update supersedes any previously delivered message.
update public.reading_sessions set calendar_sequence = 1;

create function public.advance_calendar_sequence()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.calendar_sequence := old.calendar_sequence + 1;
  return new;
end;
$$;

create trigger advance_calendar_sequence
before update on public.reading_sessions
for each row execute function public.advance_calendar_sequence();
