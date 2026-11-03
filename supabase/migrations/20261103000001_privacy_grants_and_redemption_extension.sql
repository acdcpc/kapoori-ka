-- Two fixes found while shipping the launch promo.
--
-- 1. user_privacy_preferences was unusable from the client. Row level security
--    and its policy are correct (auth.uid() = user_id), but the table grants
--    only REFERENCES/TRIGGER/TRUNCATE to anon and authenticated — there was no
--    SELECT, INSERT or UPDATE, so every read and write failed with 42501 and
--    the app silently fell back to defaults. service_role could not write
--    either. The same default-privilege leak that gave TRUNCATE on the
--    broadcast tables is present here, so it is revoked while we are in here.
--
-- 2. Redeeming a code overwrote the subscription end date with "now + term",
--    which could shorten an existing longer entitlement. It now keeps whichever
--    end date is later.

revoke all on public.user_privacy_preferences from anon, authenticated;
revoke all on public.user_privacy_preferences from service_role;

grant select, insert, update on public.user_privacy_preferences to authenticated;
grant all on public.user_privacy_preferences to service_role;

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
  -- Extend, never shorten: a redemption takes whichever end date is later, so a
  -- user who already holds a longer term keeps it. The plan and price follow the
  -- entitlement that wins.
  on conflict (user_id) do update
  set status = 'active',
      plan = case when excluded.end_date >= subscriptions.end_date then excluded.plan else subscriptions.plan end,
      start_date = least(subscriptions.start_date, excluded.start_date),
      end_date = greatest(subscriptions.end_date, excluded.end_date),
      auto_renew = false,
      price = case when excluded.end_date >= subscriptions.end_date then excluded.price else subscriptions.price end;

  delete from public.rate_limits where user_id = v_user_id;

  -- Report what the subscription actually ends on. If the user already held a
  -- longer term, v_end_date was not the winner, and telling them "valid until"
  -- the shorter date would be wrong.
  select s.end_date into v_end_date from public.subscriptions s where s.user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'plan', v_plan,
    'end_date', v_end_date,
    'remaining', v_rec.max_redemptions - (v_rec.redemption_count + 1)
  );
end;
$function$;

-- service_role also could not write subscriptions (42501 on INSERT), which is
-- the same default-privilege gap: server-side paths such as approval and
-- redemption are supposed to run as this role. It bypasses RLS by design, so it
-- gets the full table privileges it is meant to have.
grant all on public.subscriptions to service_role;
