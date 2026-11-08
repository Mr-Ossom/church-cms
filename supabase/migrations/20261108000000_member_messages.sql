-- Member <-> facilitator private messaging
-- Members start a conversation with an active admin, pastor or leader.

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  member_profile_id uuid not null references public.profiles (id) on delete cascade,
  facilitator_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (member_profile_id <> facilitator_profile_id),
  unique (member_profile_id, facilitator_profile_id)
);

create table public.thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  sender_profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index message_threads_member_idx on public.message_threads (member_profile_id);
create index message_threads_facilitator_idx on public.message_threads (facilitator_profile_id);
create index thread_messages_thread_idx on public.thread_messages (thread_id, created_at);
create index thread_messages_unread_idx on public.thread_messages (thread_id) where read_at is null;

create trigger message_threads_updated_at before update on public.message_threads
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_active_facilitator(profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_id
      and active
      and role in ('admin', 'pastor', 'leader')
  );
$$;

create or replace function public.is_thread_participant(p_thread_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.message_threads
    where id = p_thread_id
      and (member_profile_id = auth.uid() or facilitator_profile_id = auth.uid())
  );
$$;

create or replace function public.list_facilitators()
returns table (
  id uuid,
  full_name text,
  role public.user_role,
  group_names text[]
)
language sql stable security definer set search_path = public
as $$
  select
    p.id,
    coalesce(nullif(p.full_name, ''), p.email, 'Facilitator') as full_name,
    p.role,
    coalesce(array_agg(distinct g.name) filter (where g.id is not null), '{}'::text[]) as group_names
  from public.profiles p
  left join public.group_members gm on gm.member_id = p.member_id
  left join public.groups g on g.id = gm.group_id and g.active
  where p.active
    and p.role in ('admin', 'pastor', 'leader')
    and p.id <> auth.uid()
  group by p.id
  order by case p.role when 'admin' then 0 when 'pastor' then 1 else 2 end, full_name;
$$;

create or replace function public.message_threads_overview()
returns table (
  id uuid,
  member_profile_id uuid,
  facilitator_profile_id uuid,
  counterpart_name text,
  counterpart_role public.user_role,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql stable security definer set search_path = public
as $$
  select
    t.id,
    t.member_profile_id,
    t.facilitator_profile_id,
    case
      when t.member_profile_id = auth.uid()
        then coalesce(nullif(f.full_name, ''), f.email, 'Facilitator')
      else coalesce(nullif(m.full_name, ''), m.email, 'Member')
    end as counterpart_name,
    case when t.member_profile_id = auth.uid() then f.role else m.role end as counterpart_role,
    lm.body as last_message,
    lm.created_at as last_message_at,
    (
      select count(*)
      from public.thread_messages tm
      where tm.thread_id = t.id
        and tm.sender_profile_id <> auth.uid()
        and tm.read_at is null
    )::bigint as unread_count
  from public.message_threads t
  join public.profiles m on m.id = t.member_profile_id
  join public.profiles f on f.id = t.facilitator_profile_id
  left join lateral (
    select body, created_at
    from public.thread_messages
    where thread_id = t.id
    order by created_at desc
    limit 1
  ) lm on true
  where t.member_profile_id = auth.uid()
     or t.facilitator_profile_id = auth.uid()
  order by coalesce(lm.created_at, t.created_at) desc;
$$;

create or replace function public.mark_thread_read(p_thread_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_thread_participant(p_thread_id) then
    raise exception 'Not authorized';
  end if;

  update public.thread_messages
  set read_at = now()
  where thread_id = p_thread_id
    and sender_profile_id <> auth.uid()
    and read_at is null;
end;
$$;

-- Keep threads ordered by the latest message.
create or replace function public.bump_thread_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.message_threads
  set updated_at = new.created_at
  where id = new.thread_id;
  return new;
end;
$$;

create trigger thread_messages_bump_thread after insert on public.thread_messages
for each row execute function public.bump_thread_updated_at();

revoke all on function public.is_active_facilitator(uuid) from public;
revoke all on function public.is_thread_participant(uuid) from public;
revoke all on function public.list_facilitators() from public;
revoke all on function public.message_threads_overview() from public;
revoke all on function public.mark_thread_read(uuid) from public;
grant execute on function public.is_active_facilitator(uuid) to authenticated;
grant execute on function public.is_thread_participant(uuid) to authenticated;
grant execute on function public.list_facilitators() to authenticated;
grant execute on function public.message_threads_overview() to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.message_threads enable row level security;
alter table public.thread_messages enable row level security;

create policy message_threads_select on public.message_threads
for select to authenticated using (
  member_profile_id = auth.uid() or facilitator_profile_id = auth.uid()
);
create policy message_threads_insert on public.message_threads
for insert to authenticated with check (
  member_profile_id = auth.uid()
  and public.is_active_facilitator(facilitator_profile_id)
);

create policy thread_messages_select on public.thread_messages
for select to authenticated using (public.is_thread_participant(thread_id));
create policy thread_messages_insert on public.thread_messages
for insert to authenticated with check (
  sender_profile_id = auth.uid()
  and public.is_thread_participant(thread_id)
);
