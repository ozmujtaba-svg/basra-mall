create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  commission_rate numeric(5,4) not null default 0.05 check (commission_rate between 0 and 1),
  delivery_fee integer not null default 5000 check (delivery_fee >= 0),
  updated_at timestamptz not null default now()
);

alter table public.platform_settings
add column if not exists delivery_fees jsonb not null default '{
  "العشار": 3000,
  "الجزائر": 3000,
  "بريهة": 3000,
  "البراضعية": 3000,
  "الطويسة": 3500,
  "الرباط": 3500,
  "القبلة": 4000,
  "الجمهورية": 4000,
  "الحيانية": 4000,
  "خمسة ميل": 4500,
  "المعقل": 4500,
  "الزبير": 7000,
  "أبو الخصيب": 7000,
  "القرنة": 10000,
  "المدينة": 12000,
  "شط العرب": 8000
}'::jsonb;

insert into public.platform_settings (id)
values (true)
on conflict (id) do nothing;

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;
create trigger platform_settings_set_updated_at before update on public.platform_settings
for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_read_authenticated" on public.platform_settings;
create policy "platform_settings_read_authenticated" on public.platform_settings
for select to authenticated using (true);

drop policy if exists "platform_settings_update_admin" on public.platform_settings;
create policy "platform_settings_update_admin" on public.platform_settings
for update to authenticated using (public.is_admin())
with check (public.is_admin());

grant select, update on public.platform_settings to authenticated;

create or replace function public.apply_official_delivery_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_settings public.platform_settings%rowtype;
  area_fee integer;
begin
  select * into current_settings
  from public.platform_settings
  where id = true;

  area_fee := (current_settings.delivery_fees ->> new.area)::integer;
  new.delivery_fee := coalesce(area_fee, current_settings.delivery_fee, 5000);
  return new;
end;
$$;

drop trigger if exists marketplace_orders_apply_delivery_fee on public.marketplace_orders;
create trigger marketplace_orders_apply_delivery_fee
before insert on public.marketplace_orders
for each row execute function public.apply_official_delivery_fee();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'platform_settings'
  ) then
    alter publication supabase_realtime add table public.platform_settings;
  end if;
end;
$$;
