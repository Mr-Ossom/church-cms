-- Self-service signups create a linked visitor member record.
-- Team invitations keep the profile-only behavior because they do not set self_signup.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_phone text;
  v_member_id uuid;
  v_self_signup boolean;
begin
  v_first_name := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  v_last_name := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(concat_ws(' ', v_first_name, v_last_name)), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  v_first_name := coalesce(v_first_name, split_part(v_full_name, ' ', 1));
  v_last_name := coalesce(
    v_last_name,
    nullif(trim(substr(v_full_name, length(v_first_name) + 1)), ''),
    ''
  );
  v_phone := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
  v_self_signup := lower(coalesce(new.raw_user_meta_data ->> 'self_signup', 'false')) = 'true';

  if v_self_signup then
    insert into public.members (first_name, last_name, phone, email, status, notes)
    values (
      v_first_name,
      v_last_name,
      v_phone,
      new.email,
      'visitor',
      'Self-registered through the member portal'
    )
    returning id into v_member_id;
  end if;

  insert into public.profiles (id, member_id, full_name, email, phone, role)
  values (new.id, v_member_id, v_full_name, new.email, v_phone, 'member')
  on conflict (id) do nothing;

  return new;
end;
$$;
