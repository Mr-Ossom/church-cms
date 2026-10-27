-- ChurchOS initial schema
-- Run with: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'pastor', 'leader', 'member');
create type public.member_status as enum ('active', 'visitor', 'inactive', 'transferred');
create type public.group_type as enum ('ministry', 'department', 'small_group');
create type public.event_type as enum ('service', 'event', 'meeting');
create type public.event_visibility as enum ('all', 'groups', 'leaders', 'staff');
create type public.attendance_status as enum ('present', 'absent', 'excused');
create type public.donation_type as enum ('tithe', 'offering', 'pledge', 'seed', 'other');
create type public.donation_method as enum ('cash', 'bank_transfer', 'mobile_money', 'card', 'other');
create type public.announcement_audience as enum ('all', 'staff', 'leaders', 'group');
create type public.message_channel as enum ('sms', 'whatsapp', 'in_app');
create type public.message_status as enum ('queued', 'sent', 'failed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.church_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Your Church',
  tagline text,
  address text,
  currency text not null default 'GHS',
  country_code text not null default '+233',
  timezone text not null default 'Africa/Accra',
  logo_url text,
  service_times jsonb not null default '[]'::jsonb,
  sms_sender_id text,
  whatsapp_number text,
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  other_names text,
  gender text check (gender in ('male', 'female', 'other')),
  date_of_birth date,
  marital_status text check (marital_status in ('single', 'married', 'widowed', 'divorced', 'other')),
  phone text,
  email text,
  address text,
  photo_url text,
  joined_date date not null default current_date,
  status public.member_status not null default 'active',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  full_name text,
  email text,
  phone text,
  role public.user_role not null default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.members
  add constraint members_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  relationship text not null default 'member',
  unique (family_id, member_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.group_type not null default 'ministry',
  description text,
  leader_id uuid references public.members (id) on delete set null,
  meeting_day text,
  meeting_time text,
  location text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  role text not null default 'member',
  joined_at date not null default current_date,
  unique (group_id, member_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type public.event_type not null default 'service',
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  is_recurring boolean not null default false,
  recurrence_rule text,
  visibility public.event_visibility not null default 'all',
  group_id uuid references public.groups (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete cascade,
  title text not null,
  session_date date not null default current_date,
  headcount int not null default 0 check (headcount >= 0),
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status public.attendance_status not null default 'present',
  checked_in_at timestamptz not null default now(),
  unique (session_id, member_id)
);

create table public.pledges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  start_date date not null default current_date,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members (id) on delete set null,
  pledge_id uuid references public.pledges (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'GHS',
  type public.donation_type not null default 'offering',
  method public.donation_method not null default 'cash',
  reference text,
  donation_date date not null default current_date,
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience public.announcement_audience not null default 'all',
  group_id uuid references public.groups (id) on delete set null,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.message_logs (
  id uuid primary key default gen_random_uuid(),
  channel public.message_channel not null,
  recipient text,
  body text,
  status public.message_status not null default 'queued',
  provider_id text,
  error text,
  announcement_id uuid references public.announcements (id) on delete set null,
  sent_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index members_status_idx on public.members (status);
create index members_name_idx on public.members (last_name, first_name);
create index profiles_member_idx on public.profiles (member_id);
create index family_members_family_idx on public.family_members (family_id);
create index family_members_member_idx on public.family_members (member_id);
create index group_members_group_idx on public.group_members (group_id);
create index group_members_member_idx on public.group_members (member_id);
create index events_starts_idx on public.events (starts_at);
create index attendance_sessions_event_idx on public.attendance_sessions (event_id);
create index attendance_sessions_date_idx on public.attendance_sessions (session_date);
create index attendance_records_session_idx on public.attendance_records (session_id);
create index attendance_records_member_idx on public.attendance_records (member_id);
create index donations_date_idx on public.donations (donation_date);
create index donations_member_idx on public.donations (member_id);
create index donations_pledge_idx on public.donations (pledge_id);
create index announcements_publish_idx on public.announcements (publish_at);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer avoids RLS recursion on profiles)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_member_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select member_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role in ('admin', 'pastor') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

revoke execute on function public.current_user_role() from anon;
revoke execute on function public.current_member_id() from anon;
revoke execute on function public.is_staff() from anon;
revoke execute on function public.is_admin() from anon;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger church_settings_updated_at before update on public.church_settings
for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger members_updated_at before update on public.members
for each row execute function public.set_updated_at();
create trigger families_updated_at before update on public.families
for each row execute function public.set_updated_at();
create trigger groups_updated_at before update on public.groups
for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
for each row execute function public.set_updated_at();

-- New auth users are always created as members. Admins promote them afterwards.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Members must not be able to escalate their own role / re-activate themselves.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.active is distinct from old.active or new.member_id is distinct from old.member_id then
      raise exception 'Only admins can change role, status, or linked member';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields before update on public.profiles
for each row execute function public.protect_profile_fields();

create or replace function public.log_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_action text;
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_action := 'delete';
    v_id := old.id::text;
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_id := new.id::text;
  else
    v_action := 'insert';
    v_id := new.id::text;
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (
    auth.uid(),
    v_action,
    tg_table_name,
    v_id,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger members_audit after insert or update or delete on public.members
for each row execute function public.log_change();
create trigger donations_audit after insert or update or delete on public.donations
for each row execute function public.log_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.church_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.pledges enable row level security;
alter table public.donations enable row level security;
alter table public.announcements enable row level security;
alter table public.message_logs enable row level security;
alter table public.audit_logs enable row level security;

-- Church settings
create policy church_settings_select on public.church_settings
for select to authenticated using (true);
create policy church_settings_update_admin on public.church_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy church_settings_insert_admin on public.church_settings
for insert to authenticated with check (public.is_admin());

-- Profiles
create policy profiles_select_own on public.profiles
for select to authenticated using (id = auth.uid());
create policy profiles_select_staff on public.profiles
for select to authenticated using (public.is_staff());
create policy profiles_select_leader_group on public.profiles
for select to authenticated using (
  exists (
    select 1
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    join public.members m on m.id = gm.member_id
    where g.leader_id = public.current_member_id()
      and m.id = profiles.member_id
  )
);
create policy profiles_update_own on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Members
create policy members_select_staff on public.members
for select to authenticated using (public.is_staff());
create policy members_select_self on public.members
for select to authenticated using (id = public.current_member_id());
create policy members_select_leader on public.members
for select to authenticated using (
  exists (
    select 1 from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.member_id = members.id
      and g.leader_id = public.current_member_id()
  )
);
create policy members_admin_all on public.members
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Families
create policy families_select_staff on public.families
for select to authenticated using (public.is_staff());
create policy families_select_own on public.families
for select to authenticated using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = families.id
      and fm.member_id = public.current_member_id()
  )
);
create policy families_select_leader on public.families
for select to authenticated using (
  exists (
    select 1
    from public.family_members fm
    join public.group_members gm on gm.member_id = fm.member_id
    join public.groups g on g.id = gm.group_id
    where fm.family_id = families.id
      and g.leader_id = public.current_member_id()
  )
);
create policy families_admin_all on public.families
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Family members
create policy family_members_select_staff on public.family_members
for select to authenticated using (public.is_staff());
create policy family_members_select_own on public.family_members
for select to authenticated using (
  member_id = public.current_member_id()
  or exists (
    select 1 from public.family_members mine
    where mine.family_id = family_members.family_id
      and mine.member_id = public.current_member_id()
  )
);
create policy family_members_select_leader on public.family_members
for select to authenticated using (
  exists (
    select 1 from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.member_id = family_members.member_id
      and g.leader_id = public.current_member_id()
  )
);
create policy family_members_admin_all on public.family_members
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Groups
create policy groups_select on public.groups
for select to authenticated using (true);
create policy groups_admin_all on public.groups
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy groups_update_leader on public.groups
for update to authenticated
using (leader_id = public.current_member_id())
with check (leader_id = public.current_member_id());

-- Group members
create policy group_members_select on public.group_members
for select to authenticated using (true);
create policy group_members_admin_all on public.group_members
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy group_members_leader_write on public.group_members
for all to authenticated
using (
  exists (select 1 from public.groups g where g.id = group_members.group_id and g.leader_id = public.current_member_id())
)
with check (
  exists (select 1 from public.groups g where g.id = group_members.group_id and g.leader_id = public.current_member_id())
);

-- Events
create policy events_select on public.events
for select to authenticated using (
  public.is_staff()
  or visibility = 'all'
  or (visibility = 'leaders' and public.current_user_role() = 'leader')
  or (
    visibility = 'groups'
    and (
      exists (
        select 1 from public.group_members gm
        where gm.group_id = events.group_id
          and gm.member_id = public.current_member_id()
      )
      or exists (
        select 1 from public.groups g
        where g.id = events.group_id
          and g.leader_id = public.current_member_id()
      )
    )
  )
);
create policy events_admin_all on public.events
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy events_leader_write on public.events
for all to authenticated
using (
  exists (select 1 from public.groups g where g.id = events.group_id and g.leader_id = public.current_member_id())
)
with check (
  exists (select 1 from public.groups g where g.id = events.group_id and g.leader_id = public.current_member_id())
);

-- Attendance sessions
create policy attendance_sessions_select_staff on public.attendance_sessions
for select to authenticated using (public.is_staff());
create policy attendance_sessions_select_leader on public.attendance_sessions
for select to authenticated using (
  exists (
    select 1 from public.events e
    join public.groups g on g.id = e.group_id
    where e.id = attendance_sessions.event_id
      and g.leader_id = public.current_member_id()
  )
);
create policy attendance_sessions_admin_all on public.attendance_sessions
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy attendance_sessions_leader_write on public.attendance_sessions
for all to authenticated
using (
  exists (
    select 1 from public.events e
    join public.groups g on g.id = e.group_id
    where e.id = attendance_sessions.event_id
      and g.leader_id = public.current_member_id()
  )
)
with check (
  exists (
    select 1 from public.events e
    join public.groups g on g.id = e.group_id
    where e.id = attendance_sessions.event_id
      and g.leader_id = public.current_member_id()
  )
);

-- Attendance records
create policy attendance_records_select_staff on public.attendance_records
for select to authenticated using (public.is_staff());
create policy attendance_records_select_self on public.attendance_records
for select to authenticated using (member_id = public.current_member_id());
create policy attendance_records_select_leader on public.attendance_records
for select to authenticated using (
  exists (
    select 1
    from public.attendance_sessions s
    join public.events e on e.id = s.event_id
    join public.groups g on g.id = e.group_id
    where s.id = attendance_records.session_id
      and g.leader_id = public.current_member_id()
  )
);
create policy attendance_records_admin_all on public.attendance_records
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy attendance_records_leader_write on public.attendance_records
for all to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions s
    join public.events e on e.id = s.event_id
    join public.groups g on g.id = e.group_id
    where s.id = attendance_records.session_id
      and g.leader_id = public.current_member_id()
  )
)
with check (
  exists (
    select 1
    from public.attendance_sessions s
    join public.events e on e.id = s.event_id
    join public.groups g on g.id = e.group_id
    where s.id = attendance_records.session_id
      and g.leader_id = public.current_member_id()
  )
);

-- Pledges
create policy pledges_select_self on public.pledges
for select to authenticated using (member_id = public.current_member_id());
create policy pledges_admin_all on public.pledges
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Donations: admins only, members see their own giving.
create policy donations_select_self on public.donations
for select to authenticated using (member_id = public.current_member_id());
create policy donations_admin_all on public.donations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Announcements
create policy announcements_select on public.announcements
for select to authenticated using (
  public.is_staff()
  or (
    publish_at <= now()
    and (expires_at is null or expires_at > now())
    and (
      audience = 'all'
      or (audience = 'leaders' and public.current_user_role() = 'leader')
      or (
        audience = 'group'
        and (
          exists (
            select 1 from public.group_members gm
            where gm.group_id = announcements.group_id
              and gm.member_id = public.current_member_id()
          )
          or exists (
            select 1 from public.groups g
            where g.id = announcements.group_id
              and g.leader_id = public.current_member_id()
          )
        )
      )
    )
  )
);
create policy announcements_staff_write on public.announcements
for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy announcements_leader_insert on public.announcements
for insert to authenticated with check (
  audience = 'group'
  and exists (select 1 from public.groups g where g.id = announcements.group_id and g.leader_id = public.current_member_id())
);
create policy announcements_leader_update on public.announcements
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());
create policy announcements_leader_delete on public.announcements
for delete to authenticated using (created_by = auth.uid());

-- Message logs
create policy message_logs_select_staff on public.message_logs
for select to authenticated using (public.is_staff());
create policy message_logs_insert_staff on public.message_logs
for insert to authenticated with check (public.is_staff());

-- Audit logs
create policy audit_logs_select_admin on public.audit_logs
for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Finance aggregate RPC for pastors (no row-level financial access)
-- ---------------------------------------------------------------------------
create or replace function public.donation_summary()
returns table (
  month date,
  donation_type public.donation_type,
  method public.donation_method,
  total numeric,
  donations bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if public.current_user_role() not in ('admin', 'pastor') then
    raise exception 'Not authorized';
  end if;

  return query
    select date_trunc('month', d.donation_date)::date,
           d.type,
           d.method,
           sum(d.amount)::numeric,
           count(*)::bigint
    from public.donations d
    group by 1, 2, 3
    order by 1;
end;
$$;

revoke all on function public.donation_summary() from public;
grant execute on function public.donation_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', true)
on conflict (id) do nothing;

create policy "Member photos are publicly readable"
on storage.objects for select
using (bucket_id = 'member-photos');

create policy "Staff can upload member photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'member-photos' and public.is_staff());

create policy "Staff can update member photos"
on storage.objects for update to authenticated
using (bucket_id = 'member-photos' and public.is_staff());

create policy "Staff can delete member photos"
on storage.objects for delete to authenticated
using (bucket_id = 'member-photos' and public.is_staff());
