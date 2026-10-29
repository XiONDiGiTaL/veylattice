-- DRAFT — NOT APPLIED. Proposal: docs/proposals/SERVER_AUTHORITATIVE_MULTIPLAYER.md
-- Do not move into supabase/migrations/ or run against any database without
-- explicit owner approval. Requires Supabase Auth anonymous sign-ins enabled.
-- Written 2026-10-29; not executed anywhere (not even locally).

-- Link a JWT identity to an existing recovery-code account (one-time proof).
alter table public.veylattice_accounts
  add column if not exists auth_user_id uuid unique;

create table if not exists public.veylattice_rooms (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_uid uuid not null,
  guest_uid uuid,
  host_deck jsonb,
  guest_deck jsonb,
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  status text not null default 'waiting'
    check (status in ('waiting', 'ready', 'in_match', 'finished', 'closed')),
  match_id uuid,
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now(),
  constraint veylattice_room_decks check (
    (host_deck is null or (jsonb_typeof(host_deck) = 'array' and jsonb_array_length(host_deck) between 20 and 40))
    and (guest_deck is null or (jsonb_typeof(guest_deck) = 'array' and jsonb_array_length(guest_deck) between 20 and 40))
  )
);

create table if not exists public.veylattice_matches (
  id uuid primary key default gen_random_uuid(),
  room_code text,
  seat0_uid uuid not null,
  seat1_uid uuid not null,
  state jsonb not null,            -- full engine state incl. hands + deck order: service role only
  version integer not null default 0,
  deadline_at timestamptz,
  status text not null default 'in_match'
    check (status in ('in_match', 'over', 'abandoned')),
  result jsonb,
  missed_deadlines integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint veylattice_match_seats_distinct check (seat0_uid <> seat1_uid),
  constraint veylattice_match_state_size check (char_length(state::text) <= 400000)
);
create index if not exists veylattice_matches_seat0 on public.veylattice_matches (seat0_uid) where status = 'in_match';
create index if not exists veylattice_matches_seat1 on public.veylattice_matches (seat1_uid) where status = 'in_match';

create table if not exists public.veylattice_match_commands (
  match_id uuid not null references public.veylattice_matches (id) on delete cascade,
  seq integer not null,
  seat smallint not null check (seat in (0, 1)),
  command_id text not null check (char_length(command_id) between 1 and 80),
  command jsonb not null check (char_length(command::text) <= 2000),
  accepted boolean not null,
  error_code text,
  created_at timestamptz not null default now(),
  primary key (match_id, seq),
  unique (match_id, command_id)
);

-- No client may touch these tables directly; the Edge Function uses the
-- service role, and the two RPCs below are the only client read paths.
alter table public.veylattice_rooms enable row level security;
alter table public.veylattice_matches enable row level security;
alter table public.veylattice_match_commands enable row level security;
revoke all on table public.veylattice_rooms, public.veylattice_matches, public.veylattice_match_commands
  from anon, authenticated;

-- Redacted view for the caller's seat: opponent hand -> count, decks -> counts.
create or replace function public.veylattice_match_view(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.veylattice_matches;
  me uuid := auth.uid();
  my_seat int;
  foe_seat int;
  s jsonb;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into m from public.veylattice_matches where id = p_match_id;
  if not found then raise exception 'match not found'; end if;
  if m.seat0_uid = me then my_seat := 0; elsif m.seat1_uid = me then my_seat := 1;
  else raise exception 'not a participant' using errcode = '42501'; end if;
  foe_seat := 1 - my_seat;
  s := m.state;
  -- players is an array indexed by seat in the engine state.
  s := jsonb_set(s, array['players', foe_seat::text, 'hand'],
                 to_jsonb(jsonb_array_length(s #> array['players', foe_seat::text, 'hand'])));
  s := jsonb_set(s, array['players', foe_seat::text, 'deck'],
                 to_jsonb(jsonb_array_length(s #> array['players', foe_seat::text, 'deck'])));
  s := jsonb_set(s, array['players', my_seat::text, 'deck'],
                 to_jsonb(jsonb_array_length(s #> array['players', my_seat::text, 'deck'])));
  return jsonb_build_object('id', m.id, 'mySeat', my_seat, 'version', m.version,
    'deadlineAt', m.deadline_at, 'status', m.status, 'result', m.result, 'state', s);
end;
$$;

create or replace function public.veylattice_my_active_matches()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select id from public.veylattice_matches
  where status = 'in_match' and auth.uid() in (seat0_uid, seat1_uid)
  order by updated_at desc limit 5;
$$;

revoke all on function public.veylattice_match_view(uuid) from public, anon;
revoke all on function public.veylattice_my_active_matches() from public, anon;
grant execute on function public.veylattice_match_view(uuid) to authenticated;
grant execute on function public.veylattice_my_active_matches() to authenticated;

-- Realtime Authorization: only the two seated uids may receive on `match:<id>`.
-- (Requires private channels; clients subscribe with { config: { private: true } }.)
create policy "veylattice match participants receive"
  on realtime.messages for select to authenticated
  using (
    realtime.topic() like 'match:%'
    and exists (
      select 1 from public.veylattice_matches m
      where m.id::text = substring(realtime.topic() from 7)
        and auth.uid() in (m.seat0_uid, m.seat1_uid)
    )
  );

notify pgrst, 'reload schema';
