-- StoryTurn / Bedtime Readers schema (Supabase Postgres)
-- Apply with Supabase CLI or SQL editor when credentials are available.

create extension if not exists "pgcrypto";

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  role text not null check (role in ('owner', 'reader')),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table public.kids (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  age int not null check (age >= 0 and age < 21),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  code text not null unique,
  created_by_member_id uuid not null references public.family_members (id),
  expires_at timestamptz,
  max_uses int,
  uses int not null default 0,
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  authors text[] not null default '{}',
  open_library_key text,
  cover_url text,
  isbn text,
  created_at timestamptz not null default now()
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  mode text not null default 'together',
  reader_rotation_member_ids uuid[] not null,
  start_date date not null,
  time_local time not null,
  timezone text not null,
  book_timing text not null check (book_timing in ('ahead', 'after')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  schedule_id uuid references public.schedules (id),
  scheduled_for timestamptz not null,
  status text not null check (status in ('scheduled', 'completed', 'cancelled')),
  notes text,
  ics_uid text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_assignments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions (id) on delete cascade,
  member_id uuid not null references public.family_members (id),
  is_original boolean not null default false,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.session_books (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions (id) on delete cascade,
  book_id uuid references public.books (id),
  title_freeform text,
  created_at timestamptz not null default now(),
  check (book_id is not null or title_freeform is not null)
);

create table public.session_corrections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions (id) on delete cascade,
  corrected_by_member_id uuid not null references public.family_members (id),
  reason text not null,
  before jsonb not null,
  after jsonb not null,
  created_at timestamptz not null default now()
);

create index on public.family_members (user_id);
create index on public.reading_sessions (family_id, scheduled_for);
create index on public.session_assignments (session_id);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.kids enable row level security;
alter table public.invite_codes enable row level security;
alter table public.books enable row level security;
alter table public.schedules enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.session_assignments enable row level security;
alter table public.session_books enable row level security;
alter table public.session_corrections enable row level security;

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = auth.uid()
  );
$$;

create policy "members read family" on public.families
  for select using (public.is_family_member(id));

create policy "members read members" on public.family_members
  for select using (public.is_family_member(family_id));

create policy "members manage kids" on public.kids
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "members manage books" on public.books
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "members manage schedules" on public.schedules
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "members manage sessions" on public.reading_sessions
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "members read assignments" on public.session_assignments
  for all using (
    exists (
      select 1 from public.reading_sessions s
      where s.id = session_id and public.is_family_member(s.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.reading_sessions s
      where s.id = session_id and public.is_family_member(s.family_id)
    )
  );

create policy "members manage session books" on public.session_books
  for all using (
    exists (
      select 1 from public.reading_sessions s
      where s.id = session_id and public.is_family_member(s.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.reading_sessions s
      where s.id = session_id and public.is_family_member(s.family_id)
    )
  );

create policy "members manage corrections" on public.session_corrections
  for all using (
    exists (
      select 1 from public.reading_sessions s
      where s.id = session_id and public.is_family_member(s.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.reading_sessions s
      where s.id = session_id and public.is_family_member(s.family_id)
    )
  );

create policy "members manage invites" on public.invite_codes
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
