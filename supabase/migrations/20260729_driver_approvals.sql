do $$
begin
  if not exists (select 1 from pg_type where typname = 'driver_approval_status') then
    create type public.driver_approval_status as enum ('pending', 'approved', 'rejected');
  end if;
end;
$$;

alter table public.profiles
add column if not exists driver_status public.driver_approval_status not null default 'approved';

create or replace function public.protect_profile_access()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator can change an account role';
  end if;

  if new.driver_status is distinct from old.driver_status and not public.is_admin() then
    raise exception 'Only an administrator can change driver approval';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
drop trigger if exists profiles_protect_access on public.profiles;
create trigger profiles_protect_access before update on public.profiles
for each row execute function public.protect_profile_access();

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (
  id = auth.uid()
  and role <> 'admin'
  and (role <> 'driver' or driver_status = 'pending')
);

grant select, update on public.profiles to authenticated;

create or replace function public.is_approved_driver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'driver'
      and driver_status = 'approved'
  );
$$;

drop policy if exists "marketplace_orders_read_participants" on public.marketplace_orders;
create policy "marketplace_orders_read_participants" on public.marketplace_orders
for select to authenticated using (
  customer_id = auth.uid()
  or public.is_admin()
  or merchant_phone = (select phone from public.profiles where id = auth.uid())
  or (
    public.is_approved_driver()
    and status in ('ready_for_delivery', 'in_delivery', 'delivered')
    and (driver_id is null or driver_id = auth.uid())
  )
);

drop policy if exists "marketplace_orders_update_participants" on public.marketplace_orders;
create policy "marketplace_orders_update_participants" on public.marketplace_orders
for update to authenticated using (
  customer_id = auth.uid()
  or public.is_admin()
  or merchant_phone = (select phone from public.profiles where id = auth.uid())
  or (public.is_approved_driver() and (driver_id is null or driver_id = auth.uid()))
) with check (
  public.is_admin()
  or merchant_phone = (select phone from public.profiles where id = auth.uid())
  or customer_id = auth.uid()
  or (public.is_approved_driver() and driver_id = auth.uid())
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;
