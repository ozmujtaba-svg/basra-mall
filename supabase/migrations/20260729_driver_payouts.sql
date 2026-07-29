do $$
begin
  if not exists (select 1 from pg_type where typname = 'driver_payout_status') then
    create type public.driver_payout_status as enum ('pending', 'paid');
  end if;
end;
$$;

alter table public.marketplace_orders
add column if not exists driver_payout_status public.driver_payout_status not null default 'pending';

alter table public.marketplace_orders
add column if not exists driver_paid_at timestamptz;

create or replace function public.protect_driver_payout()
returns trigger
language plpgsql
as $$
begin
  if (
    new.driver_payout_status is distinct from old.driver_payout_status
    or new.driver_paid_at is distinct from old.driver_paid_at
  ) and not public.is_admin() then
    raise exception 'Only an administrator can update driver payouts';
  end if;

  if new.driver_payout_status = 'paid' and new.status <> 'delivered' then
    raise exception 'Only delivered orders can be paid to a driver';
  end if;

  if new.driver_payout_status = 'paid' and new.driver_id is null then
    raise exception 'A paid delivery must have an assigned driver';
  end if;

  return new;
end;
$$;

drop trigger if exists marketplace_orders_protect_driver_payout on public.marketplace_orders;
create trigger marketplace_orders_protect_driver_payout
before update on public.marketplace_orders
for each row execute function public.protect_driver_payout();
