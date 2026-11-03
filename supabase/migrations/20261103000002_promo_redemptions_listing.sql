-- Who actually redeemed a promo code, so the admin can follow up personally.
--
-- A count is not enough: the launch offer is "first 100 users", and the point of
-- following up is knowing which 100. activation_codes is keyed by code_hash, and
-- a hash of a short human-typed code must never be exposed (it is brute-forceable
-- offline), so this adds a surrogate id to reference a code safely.

alter table public.activation_codes
  add column if not exists id uuid not null default gen_random_uuid();

create unique index if not exists activation_codes_id_key
  on public.activation_codes (id);

-- The listing now also hands back the id the app uses to open a code.
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
      select c.id,
             c.label,
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

-- Everyone who redeemed one code, newest last, with the details needed to reach
-- them. Emails come from auth.users, names from profiles; guests are flagged so
-- the admin knows there may be no address to reply to.
create or replace function public.admin_list_promo_redemptions(p_code_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_code_hash text;
begin
  if v_user_id is null or not exists (
    select 1 from public.app_admins a where a.user_id = v_user_id and a.revoked_at is null
  ) then
    return jsonb_build_object('error', 'Not authorized.');
  end if;

  select c.code_hash into v_code_hash
  from public.activation_codes c
  where c.id = p_code_id;

  if v_code_hash is null then
    return jsonb_build_object('error', 'Code not found.');
  end if;

  return jsonb_build_object(
    'code', (
      select jsonb_build_object(
        'id', c.id,
        'label', c.label,
        'plan', c.plan,
        'status', c.status,
        'max_redemptions', c.max_redemptions,
        'redemption_count', c.redemption_count,
        'remaining', greatest(c.max_redemptions - c.redemption_count, 0)
      )
      from public.activation_codes c
      where c.id = p_code_id
    ),
    'redemptions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', r.user_id,
          'redeemed_at', r.redeemed_at,
          'email', u.email,
          'phone', u.phone,
          'name', p.display_name,
          'is_anonymous', coalesce(p.is_anonymous, false)
        )
        order by r.redeemed_at
      )
      from public.activation_code_redemptions r
      left join auth.users u on u.id = r.user_id
      left join public.profiles p on p.user_id = r.user_id
      where r.code_hash = v_code_hash
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.admin_list_promo_redemptions(uuid) from public;
grant execute on function public.admin_list_promo_redemptions(uuid) to authenticated;
