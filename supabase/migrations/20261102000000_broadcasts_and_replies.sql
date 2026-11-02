-- Broadcast messages from the admin team, with optional per-user replies.
--
-- Before this, `admin-broadcast` pushed a notification and forgot about it: no
-- record of what was sent, and nothing a user could open later or answer. This
-- adds the durable side — a list the app can show as an inbox, per-user read
-- state, and replies that go back to the admin team.
--
-- Design notes:
--   * Users may read every non-archived broadcast. Audience (all/premium/free)
--     is a targeting hint for the push, not a privacy boundary; it is kept so a
--     later segmented rollout needs no migration.
--   * Nothing writes broadcasts except the service role (the Edge Function), so
--     there is deliberately no INSERT/UPDATE policy on that table.
--   * A reply is only accepted while the broadcast still allows replies, and
--     only for the signed-in user — enforced here, not in the client.
--   * Replies are private: a user can read their own replies, never anyone
--     else's. The admin team reads them through the service role.

create table if not exists public.broadcasts (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 3 and 120),
  title_ne         text,
  body             text not null check (char_length(body) between 1 and 2000),
  body_ne          text,
  audience         text not null default 'all' check (audience in ('all', 'premium', 'free')),
  allow_replies    boolean not null default false,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  pushed_at        timestamptz,
  recipient_count  integer not null default 0,
  delivered_count  integer not null default 0,
  archived_at      timestamptz
);

create table if not exists public.broadcast_reads (
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  read_at      timestamptz not null default now(),
  primary key (broadcast_id, user_id)
);

create table if not exists public.broadcast_replies (
  id           uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);

create index if not exists broadcasts_created_idx
  on public.broadcasts (created_at desc);
create index if not exists broadcast_reads_user_idx
  on public.broadcast_reads (user_id);
create index if not exists broadcast_replies_broadcast_idx
  on public.broadcast_replies (broadcast_id, created_at desc);
create index if not exists broadcast_replies_user_idx
  on public.broadcast_replies (user_id, created_at desc);
create index if not exists broadcast_replies_unread_idx
  on public.broadcast_replies (broadcast_id) where read_at is null;

alter table public.broadcasts enable row level security;
alter table public.broadcast_reads enable row level security;
alter table public.broadcast_replies enable row level security;

drop policy if exists broadcasts_select_authenticated on public.broadcasts;
create policy broadcasts_select_authenticated on public.broadcasts
  for select to authenticated
  using (archived_at is null);

drop policy if exists broadcast_reads_select_own on public.broadcast_reads;
create policy broadcast_reads_select_own on public.broadcast_reads
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists broadcast_reads_insert_own on public.broadcast_reads;
create policy broadcast_reads_insert_own on public.broadcast_reads
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists broadcast_reads_update_own on public.broadcast_reads;
create policy broadcast_reads_update_own on public.broadcast_reads
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists broadcast_replies_select_own on public.broadcast_replies;
create policy broadcast_replies_select_own on public.broadcast_replies
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists broadcast_replies_insert_own on public.broadcast_replies;
create policy broadcast_replies_insert_own on public.broadcast_replies
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.broadcasts b
      where b.id = broadcast_id
        and b.allow_replies
        and b.archived_at is null
    )
  );

-- Table privileges. RLS decides row access, but the roles still need the grants
-- or every query fails with 42501 before a policy is ever consulted.
grant select on public.broadcasts to authenticated;
grant select, insert, update on public.broadcast_reads to authenticated;
grant select, insert on public.broadcast_replies to authenticated;

grant all on public.broadcasts to service_role;
grant all on public.broadcast_reads to service_role;
grant all on public.broadcast_replies to service_role;

comment on table public.broadcasts is 'Admin broadcast messages shown in the app inbox and delivered by push.';
comment on table public.broadcast_replies is 'Private user replies to a broadcast that allows them.';
comment on table public.broadcast_reads is 'Per-user read receipts for broadcasts.';

-- Supabase's default privileges hand `authenticated` (and `anon`) a broad ALL on
-- newly created tables in the public schema, which includes TRUNCATE. TRUNCATE
-- bypasses RLS entirely, so a signed-in user holding that privilege could empty
-- these tables regardless of every policy above. Reset to exactly what the
-- application needs.
revoke all on public.broadcasts from anon, authenticated;
revoke all on public.broadcast_reads from anon, authenticated;
revoke all on public.broadcast_replies from anon, authenticated;

grant select on public.broadcasts to authenticated;
grant select, insert, update on public.broadcast_reads to authenticated;
grant select, insert on public.broadcast_replies to authenticated;
