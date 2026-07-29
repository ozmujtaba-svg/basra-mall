do $$
begin
  if not exists (select 1 from pg_type where typname = 'merchant_payout_status') then
    create type public.merchant_payout_status as enum ('pending', 'paid');
  end if;
end;
$$;

alter table public.marketplace_orders
add column if not exists commission_rate numeric(5,4) not null default 0.05
check (commission_rate between 0 and 1);

alter table public.marketplace_orders
add column if not exists merchant_payout_status public.merchant_payout_status not null default 'pending';

alter table public.marketplace_orders
add column if not exists merchant_paid_at timestamptz;

update public.marketplace_orders
set commission_rate = (
  select commission_rate from public.platform_settings where id = true
)
where commission_rate is null;

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
  new.commission_rate := coalesce(current_settings.commission_rate, 0.05);
  return new;
end;
$$;

create or replace function public.protect_merchant_payout()
returns trigger
language plpgsql
as $$
begin
  if new.commission_rate is distinct from old.commission_rate then
    raise exception 'Order commission rate cannot be changed';
  end if;

  if (
    new.merchant_payout_status is distinct from old.merchant_payout_status
    or new.merchant_paid_at is distinct from old.merchant_paid_at
  ) and not public.is_admin() then
    raise exception 'Only an administrator can update merchant payouts';
  end if;

  if new.merchant_payout_status = 'paid' and new.status <> 'delivered' then
    raise exception 'Only delivered orders can be paid to a merchant';
  end if;

  return new;
end;
$$;

drop trigger if exists marketplace_orders_protect_merchant_payout on public.marketplace_orders;
create trigger marketplace_orders_protect_merchant_payout
before update on public.marketplace_orders
for each row execute function public.protect_merchant_payout();
