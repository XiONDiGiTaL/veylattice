-- DRAFT — NOT APPLIED. Proposal: docs/proposals/CLOUD_ECONOMY_SYNC.md
-- Do not move into supabase/migrations/ or run anywhere without explicit owner
-- approval. Written 2026-10-29; parsed with the PostgreSQL parser only.
-- Assumes the identity from 0003 (veylattice_accounts.auth_user_id).

alter table public.veylattice_accounts
  add column if not exists shards integer not null default 0,
  add constraint veylattice_acct_shards_nonneg check (shards >= 0);

create table if not exists public.veylattice_economy_ledger (
  account_id uuid not null references public.veylattice_accounts (account_id) on delete cascade,
  op_id text not null check (char_length(op_id) between 1 and 80),
  kind text not null check (kind in ('starter', 'pack', 'single', 'dissolve', 'legacy_import', 'match_reward')),
  delta integer not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (account_id, op_id)
);

create table if not exists public.veylattice_collection (
  account_id uuid not null references public.veylattice_accounts (account_id) on delete cascade,
  card_id text not null check (card_id ~ '^[a-z0-9_]{3,64}$'),
  qty integer not null check (qty >= 0),
  bound_qty integer not null default 0 check (bound_qty >= 0),
  legacy_qty integer not null default 0 check (legacy_qty >= 0),
  primary key (account_id, card_id),
  constraint veylattice_collection_parts check (bound_qty + legacy_qty <= qty)
);

create table if not exists public.veylattice_decks (
  account_id uuid not null references public.veylattice_accounts (account_id) on delete cascade,
  deck_id text not null check (char_length(deck_id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 40),
  card_ids jsonb not null check (jsonb_typeof(card_ids) = 'array' and jsonb_array_length(card_ids) <= 40),
  is_draft boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (account_id, deck_id)
);

create table if not exists public.veylattice_economy_imports (
  account_id uuid not null references public.veylattice_accounts (account_id) on delete cascade,
  local_profile_id uuid not null unique,
  summary jsonb not null,
  created_at timestamptz not null default now(),
  primary key (account_id)
);

alter table public.veylattice_economy_ledger enable row level security;
alter table public.veylattice_collection enable row level security;
alter table public.veylattice_decks enable row level security;
alter table public.veylattice_economy_imports enable row level security;
revoke all on table public.veylattice_economy_ledger, public.veylattice_collection,
  public.veylattice_decks, public.veylattice_economy_imports from anon, authenticated;

-- Every balance change goes through this one function: the ledger PK makes a
-- replayed op_id a no-op, and the account check constraint forbids negatives.
create or replace function public.veylattice_economy_apply(
  p_account uuid, p_op_id text, p_kind text, p_delta integer, p_detail jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.veylattice_economy_ledger (account_id, op_id, kind, delta, detail)
  values (p_account, p_op_id, p_kind, p_delta, coalesce(p_detail, '{}'::jsonb))
  on conflict (account_id, op_id) do nothing;
  if not found then
    return false; -- already applied: idempotent replay
  end if;
  update public.veylattice_accounts set shards = shards + p_delta, updated_at = now()
  where account_id = p_account;
  return true;
end;
$$;
revoke all on function public.veylattice_economy_apply(uuid, text, text, integer, jsonb) from public, anon, authenticated;

-- Caller resolution: auth.uid() -> account (see 0003).
create or replace function public.veylattice_economy_account()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select account_id from public.veylattice_accounts where auth_user_id = auth.uid();
$$;
revoke all on function public.veylattice_economy_account() from public, anon;

-- The pack / single / dissolve / save-decks / import RPCs are specified in the
-- proposal; their bodies are deliberately left out of this draft until the
-- owner approves the import cap and legacy rules (sections 3 and 6), so no
-- one mistakes an unreviewed pricing function for a finished one.
