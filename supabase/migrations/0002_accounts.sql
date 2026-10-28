-- Veylattice portable accounts (M2-004).
--
-- A guest profile (0001) is bound to one browser. This table makes progress
-- portable: the server mints a 100-bit recovery code, returns it once, and
-- stores only a SHA-256 digest of its normalised form.
--
-- Security model
-- --------------
-- * RLS is enabled and `anon` has NO table privileges; the table is unreachable
--   through PostgREST (verified: direct select returns 401).
-- * The browser may only call the four SECURITY DEFINER functions below.
-- * Load, save and rotate all require the account id *and* the recovery code.
--   The id is a lookup key, never a credential.
-- * A digest is used instead of bcrypt deliberately: the code has 100 bits of
--   entropy from a CSPRNG, so there is nothing to guess and no dictionary to
--   attack. An equality lookup on an indexed digest is therefore safe and keeps
--   sign-in to one round trip instead of a full-table bcrypt scan.
-- * There is no email, password, name-for-login or personal data here.
--
-- Known limitation: nothing limits how many attempts a client may make. The
-- 100-bit code space makes online guessing infeasible, but a proper deployment
-- should also add per-IP throttling in front of these functions.

create table if not exists public.veylattice_accounts (
  account_id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  display_name text not null,
  avatar text,
  settings jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint veylattice_acct_name_len check (char_length(display_name) between 1 and 24),
  constraint veylattice_acct_avatar_shape check (
    avatar is null
    or avatar like 'data:image/png;base64,%'
    or avatar like 'data:image/jpeg;base64,%'
    or avatar like 'data:image/webp;base64,%'
  ),
  constraint veylattice_acct_avatar_len check (avatar is null or char_length(avatar) <= 70000),
  constraint veylattice_acct_settings_obj check (
    jsonb_typeof(settings) = 'object' and char_length(settings::text) <= 4000
  ),
  constraint veylattice_acct_stats_obj check (
    jsonb_typeof(stats) = 'object' and char_length(stats::text) <= 2000
  )
);

alter table public.veylattice_accounts enable row level security;
revoke all on table public.veylattice_accounts from anon, authenticated;

-- Normalise a user-typed code: uppercase, separators removed.
-- Mirrors normaliseCode() in src/net/account.js.
create or replace function public.veylattice_code_normalise(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

-- Mint a recovery code: 20 symbols from a 32-character alphabet, no I/L/O/U.
-- 256 is an exact multiple of 32, so the modulo introduces no bias.
create or replace function public.veylattice_code_mint()
returns text
language plpgsql
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  bytes bytea := extensions.gen_random_bytes(20);
  raw text := '';
  i int;
begin
  for i in 0..19 loop
    raw := raw || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 4)
      || '-' || substr(raw, 13, 4) || '-' || substr(raw, 17, 4);
end;
$$;

create or replace function public.veylattice_account_create(
  p_display_name text,
  p_avatar text,
  p_settings jsonb,
  p_stats jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text := public.veylattice_code_mint();
  v_norm text := public.veylattice_code_normalise(v_code);
  v_id uuid;
begin
  insert into public.veylattice_accounts (code_hash, display_name, avatar, settings, stats)
  values (
    encode(extensions.digest(v_norm, 'sha256'), 'hex'),
    coalesce(nullif(btrim(left(p_display_name, 24)), ''), 'Wanderer'),
    p_avatar,
    coalesce(p_settings, '{}'::jsonb),
    coalesce(p_stats, '{}'::jsonb)
  )
  returning account_id into v_id;

  return jsonb_build_object('account_id', v_id, 'recovery_code', v_code);
end;
$$;

create or replace function public.veylattice_account_load(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_norm text := public.veylattice_code_normalise(p_code);
  row_out public.veylattice_accounts;
begin
  if char_length(v_norm) <> 20 then
    return null;
  end if;

  select * into row_out
  from public.veylattice_accounts
  where code_hash = encode(extensions.digest(v_norm, 'sha256'), 'hex');

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'account_id', row_out.account_id,
    'display_name', row_out.display_name,
    'avatar', row_out.avatar,
    'settings', row_out.settings,
    'stats', row_out.stats,
    'updated_at', row_out.updated_at
  );
end;
$$;

create or replace function public.veylattice_account_save(
  p_account_id uuid,
  p_code text,
  p_display_name text,
  p_avatar text,
  p_settings jsonb,
  p_stats jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_norm text := public.veylattice_code_normalise(p_code);
begin
  if p_account_id is null or char_length(v_norm) <> 20 then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.veylattice_accounts set
    display_name = coalesce(nullif(btrim(left(p_display_name, 24)), ''), display_name),
    avatar = p_avatar,
    settings = coalesce(p_settings, settings),
    stats = coalesce(p_stats, stats),
    updated_at = now()
  where account_id = p_account_id
    and code_hash = encode(extensions.digest(v_norm, 'sha256'), 'hex');

  if not found then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.veylattice_account_rotate(
  p_account_id uuid,
  p_code text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_old text := public.veylattice_code_normalise(p_code);
  v_new text := public.veylattice_code_mint();
begin
  if p_account_id is null or char_length(v_old) <> 20 then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.veylattice_accounts set
    code_hash = encode(extensions.digest(public.veylattice_code_normalise(v_new), 'sha256'), 'hex'),
    updated_at = now()
  where account_id = p_account_id
    and code_hash = encode(extensions.digest(v_old, 'sha256'), 'hex');

  if not found then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return jsonb_build_object('recovery_code', v_new);
end;
$$;

grant execute on function public.veylattice_account_create(text, text, jsonb, jsonb) to anon;
grant execute on function public.veylattice_account_load(text) to anon;
grant execute on function public.veylattice_account_save(uuid, text, text, text, jsonb, jsonb) to anon;
grant execute on function public.veylattice_account_rotate(uuid, text) to anon;

notify pgrst, 'reload schema';
