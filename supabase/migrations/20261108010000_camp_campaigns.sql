-- Camp fundraising campaigns plus camp / susu donation types.

alter type public.donation_type add value if not exists 'camp';
alter type public.donation_type add value if not exists 'susu';

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  goal_amount numeric(12, 2) not null check (goal_amount > 0),
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_active_idx on public.campaigns (active);

create trigger campaigns_updated_at before update on public.campaigns
for each row execute function public.set_updated_at();

alter table public.donations
  add column campaign_id uuid references public.campaigns (id) on delete set null;

create index donations_campaign_idx on public.donations (campaign_id);

alter table public.campaigns enable row level security;

create policy campaigns_select on public.campaigns
for select to authenticated using (true);
create policy campaigns_admin_all on public.campaigns
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Aggregate progress for campaigns (members see active ones, staff see all)
-- ---------------------------------------------------------------------------
create or replace function public.campaign_summary()
returns table (
  id uuid,
  name text,
  description text,
  goal_amount numeric,
  start_date date,
  end_date date,
  active boolean,
  raised numeric,
  donations bigint,
  contributors bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  return query
    select
      c.id,
      c.name,
      c.description,
      c.goal_amount,
      c.start_date,
      c.end_date,
      c.active,
      coalesce(sum(d.amount), 0)::numeric as raised,
      count(d.id)::bigint as donations,
      count(distinct d.member_id)::bigint as contributors
    from public.campaigns c
    left join public.donations d on d.campaign_id = c.id
    where public.is_staff() or c.active
    group by c.id
    order by c.active desc, c.start_date desc;
end;
$$;

revoke all on function public.campaign_summary() from public;
grant execute on function public.campaign_summary() to authenticated;
