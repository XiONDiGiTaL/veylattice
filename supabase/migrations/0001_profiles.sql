-- Veylattice player profiles (M2-003).
--
-- Applied to the dedicated `veylattice` Supabase project only. It is a separate
-- project from any other site on this account, so nothing here can affect an
-- unrelated database.
--
-- Security model
-- --------------
-- * RLS is enabled and `anon` has NO table privileges. Direct PostgREST access
--   to public.veylattice_profiles is denied (verified: HTTP 401).
-- * The browser may only call two SECURITY DEFINER functions.
-- * Writes require a 64-hex edit token that only the originating browser holds;
--   the table stores a bcrypt hash, so a leaked database row does not grant
--   write access.
-- * Every input is constrained: name length, avatar mime/shape/size, JSON size.
--   The avatar column accepts only base64 PNG/JPEG/WebP data urls, never SVG.
--
-- This is a device identity, not an account. There is deliberately no email,
-- password, or personal data. Anyone with the id can read the public fields;
-- only the token holder can change them.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.veylattice_profiles (
  id uuid primary key,
  token_hash text not null,
  display_name text not null,
  avatar text,
  settings jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint veylattice_name_len check (char_length(display_name) between 1 and 24),
  constraint veylattice_avatar_shape check (
    avatar is null
    or avatar like 'data:image/png;base64,%'
    or avatar like 'data:image/jpeg;base64,%'
    or avatar like 'data:image/webp;base64,%'
  ),
  constraint veylattice_avatar_len check (avatar is null or char_length(avatar) <= 70000),
  constraint veylattice_settings_obj check (
    jsonb_typeof(settings) = 'object' and char_length(settings::text) <= 4000
  ),
  constraint veylattice_stats_obj check (
    jsonb_typeof(stats) = 'object' and char_length(stats::text) <= 2000
  )
);

alter table public.veylattice_profiles enable row level security;
revoke all on table public.veylattice_profiles from anon, authenticated;

-- Insert on first save, update only with the matching edit token.
create or replace function public.veylattice_profile_save(
  p_id uuid,
  p_token text,
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
  existing public.veylattice_profiles;
begin
  if p_id is null then raise exception 'profile id required'; end if;
  if p_token is null or char_length(p_token) < 16 then raise exception 'invalid edit token'; end if;
  if p_display_name is null or char_length(btrim(p_display_name)) < 1 then
    raise exception 'display name required';
  end if;

  select * into existing from public.veylattice_profiles where id = p_id;

  if found then
    if existing.token_hash is distinct from extensions.crypt(p_token, existing.token_hash) then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    update public.veylattice_profiles set
      display_name = btrim(left(p_display_name, 24)),
      avatar = p_avatar,
      settings = coalesce(p_settings, '{}'::jsonb),
      stats = coalesce(p_stats, '{}'::jsonb),
      updated_at = now()
    where id = p_id;
  else
    insert into public.veylattice_profiles (id, token_hash, display_name, avatar, settings, stats)
    values (
      p_id,
      extensions.crypt(p_token, extensions.gen_salt('bf', 10)),
      btrim(left(p_display_name, 24)),
      p_avatar,
      coalesce(p_settings, '{}'::jsonb),
      coalesce(p_stats, '{}'::jsonb)
    );
  end if;

  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

-- Public read of a single profile by id.
create or replace function public.veylattice_profile_get(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', id,
    'display_name', display_name,
    'avatar', avatar,
    'settings', settings,
    'stats', stats,
    'updated_at', updated_at
  )
  from public.veylattice_profiles
  where id = p_id;
$$;

grant execute on function public.veylattice_profile_save(uuid, text, text, text, jsonb, jsonb) to anon;
grant execute on function public.veylattice_profile_get(uuid) to anon;

notify pgrst, 'reload schema';
