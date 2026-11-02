-- Promo codes: one code, a limited number of redemptions.
--
-- The launch offer is "the first 100 users get a year". Activation codes were
-- strictly single-use (status valid -> used), so a shared code could only ever
-- be redeemed once. This adds a redemption allowance to the existing model
-- instead of introducing a second kind of code:
--
--   * if the claim UPDATE finds no row, the code is invalid, exhausted or void;
--   * one row per user per code, so a user cannot redeem the same promo twice;
--   * every redemption is recorded, which the single-use model never needed.

alter table public.activation_codes
  add column if not exists max_redemptions integer not null default 1,
  add column if not exists redemption_count integer not null default 0,
  add column if not exists label text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Existing rows were single-use; anything already spent counts as one use.
update public.activation_codes
  set redemption_count = 1
  where status = 'used' and redemption_count = 0;

alter table public.activation_codes
  drop constraint if exists activation_codes_max_redemptions_check;
alter table public.activation_codes
  add constraint activation_codes_max_redemptions_check check (max_redemptions between 1 and 100000);

-- activation_codes is keyed by code_hash, not by a surrogate id.
create table if not exists public.activation_code_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code_hash   text not null references public.activation_codes(code_hash) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (code_hash, user_id)
);

create index if not exists activation_code_redemptions_code_idx
  on public.activation_code_redemptions (code_hash);

alter table public.activation_code_redemptions enable row level security;
-- No policies on purpose: only the SECURITY DEFINER functions touch this table.
revoke all on public.activation_code_redemptions from anon, authenticated;
grant all on public.activation_code_redemptions to service_role;

create or replace function public.redeem_activation_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_code_hash text;
  v_rec record;
  v_plan text;
  v_duration_days integer;
  v_end_date timestamptz;
  v_now timestamptz := now();
  v_count integer;
  v_window timestamptz;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Must be signed in.');
  end if;

  -- Lowercase input must survive: the old pattern stripped it before the
  -- upper() call, so 'first-100' collapsed to '100' and was rejected.
  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_code) < 6 or length(v_code) > 32 then
    return jsonb_build_object('error', 'Invalid code format.');
  end if;

  v_code_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');

  insert into public.rate_limits as r (user_id, count, window_start)
  values (v_user_id, 1, v_now)
  on conflict (user_id) do update
  set count = case
        when r.window_start < v_now - interval '15 minutes' then 1
        else r.count + 1
      end,
      window_start = case
        when r.window_start < v_now - interval '15 minutes' then v_now
        else r.window_start
      end
  returning count, window_start into v_count, v_window;

  if v_count > 5 then
    return jsonb_build_object(
      'error',
      'Too many attempts. Wait ' || ceil(900 - extract(epoch from (v_now - v_window))) || 's.'
    );
  end if;

  -- Lock the row so two concurrent redemptions of a limited code cannot both
  -- take the last remaining slot.
  select * into v_rec
  from public.activation_codes
  where code_hash = v_code_hash
  for update;

  if not found then
    return jsonb_build_object('error', 'Invalid code.');
  end if;
  if v_rec.voided_at is not null or v_rec.status <> 'valid' then
    return jsonb_build_object('error', 'This code is no longer available.');
  end if;
  if v_rec.redemption_count >= v_rec.max_redemptions then
    return jsonb_build_object('error', 'This code has been fully redeemed.');
  end if;

  if exists (
    select 1 from public.activation_code_redemptions r
    where r.code_hash = v_rec.code_hash and r.user_id = v_user_id
  ) then
    return jsonb_build_object('error', 'You have already redeemed this code.');
  end if;

  v_plan := coalesce(v_rec.plan, 'yearly');
  v_duration_days := case when v_plan = 'yearly' then 365 when v_plan = '6months' then 180 else 30 end;
  v_end_date := v_now + (v_duration_days || ' days')::interval;

  update public.activation_codes
  set redemption_count = redemption_count + 1,
      used_by = coalesce(used_by, v_user_id),
      used_at = coalesce(used_at, v_now),
      status = case when redemption_count + 1 >= max_redemptions then 'used' else 'valid' end
  where code_hash = v_rec.code_hash;

  insert into public.activation_code_redemptions (code_hash, user_id)
  values (v_rec.code_hash, v_user_id);

  insert into public.subscriptions (user_id, status, plan, start_date, end_date, auto_renew, price)
  values (
    v_user_id, 'active', v_plan, v_now, v_end_date, false,
    case when v_plan = 'yearly' then 850 when v_plan = '6months' then 650 else 100 end
  )
  on conflict (user_id) do update
  set status = 'active',
      plan = excluded.plan,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      auto_renew = false,
      price = excluded.price;

  delete from public.rate_limits where user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'plan', v_plan,
    'end_date', v_end_date,
    'remaining', v_rec.max_redemptions - (v_rec.redemption_count + 1)
  );
end;
$function$;

-- Admin: create a promo code. The code itself is never stored in clear, only its
-- hash, and the plaintext is returned once to the caller.
create or replace function public.admin_create_promo_code(
  p_code text,
  p_plan text default 'yearly',
  p_max_redemptions integer default 100,
  p_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_plan text := coalesce(nullif(p_plan, ''), 'yearly');
begin
  if v_user_id is null or not exists (
    select 1 from public.app_admins a where a.user_id = v_user_id and a.revoked_at is null
  ) then
    return jsonb_build_object('error', 'Not authorized.');
  end if;

  -- Lowercase input must survive: the old pattern stripped it before the
  -- upper() call, so 'first-100' collapsed to '100' and was rejected.
  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_code) < 6 or length(v_code) > 32 then
    return jsonb_build_object('error', 'A code between 6 and 32 letters/numbers is required.');
  end if;
  if v_plan not in ('yearly', '6months', 'monthly') then
    return jsonb_build_object('error', 'Unknown plan.');
  end if;
  if coalesce(p_max_redemptions, 0) < 1 or p_max_redemptions > 100000 then
    return jsonb_build_object('error', 'Redemptions must be between 1 and 100000.');
  end if;

  if exists (select 1 from public.activation_codes c where c.code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')) then
    return jsonb_build_object('error', 'That code already exists.');
  end if;

  insert into public.activation_codes (code_hash, plan, status, max_redemptions, redemption_count, label, created_by)
  values (encode(extensions.digest(v_code, 'sha256'), 'hex'), v_plan, 'valid', p_max_redemptions, 0, p_label, v_user_id);

  return jsonb_build_object('success', true, 'code', v_code, 'plan', v_plan, 'max_redemptions', p_max_redemptions);
end;
$function$;

-- Admin: how many slots are left. Hashes are never returned.
create or replace function public.admin_list_promo_codes()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1 from public.app_admins a where a.user_id = v_user_id and a.revoked_at is null
  ) then
    return jsonb_build_object('error', 'Not authorized.');
  end if;

  return jsonb_build_object('codes', coalesce((
    select jsonb_agg(row_to_json(t) order by t.last_redeemed_at desc nulls last, t.label)
    from (
      select c.label,
             c.plan,
             c.status,
             c.max_redemptions,
             c.redemption_count,
             greatest(c.max_redemptions - c.redemption_count, 0) as remaining,
             c.used_at as last_redeemed_at,
             c.voided_at
      from public.activation_codes c
      where c.max_redemptions > 1 or c.label is not null
      order by c.used_at desc nulls last, c.label
      limit 50
    ) t
  ), '[]'::jsonb));
end;
$function$;

revoke all on function public.admin_create_promo_code(text, text, integer, text) from public;
revoke all on function public.admin_list_promo_codes() from public;
grant execute on function public.admin_create_promo_code(text, text, integer, text) to authenticated;
grant execute on function public.admin_list_promo_codes() to authenticated;
