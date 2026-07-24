create table if not exists public.marketplace_orders (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  merchant_phone text not null,
  store_name text not null,
  area text not null,
  landmark text not null default '',
  notes text not null default '',
  payment_method text not null default 'cash_on_delivery',
  status public.order_status not null default 'new',
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  internal_note text not null default '',
  driver_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists marketplace_orders_set_updated_at on public.marketplace_orders;
create trigger marketplace_orders_set_updated_at before update on public.marketplace_orders
for each row execute function public.set_updated_at();

create or replace function public.protect_marketplace_order_identity()
returns trigger
language plpgsql
as $$
begin
  if new.customer_id is distinct from old.customer_id
    or new.customer_phone is distinct from old.customer_phone
    or new.merchant_phone is distinct from old.merchant_phone
    or new.store_name is distinct from old.store_name
    or new.items is distinct from old.items
    or new.subtotal is distinct from old.subtotal
    or new.delivery_fee is distinct from old.delivery_fee then
    raise exception 'Order identity and totals cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists marketplace_orders_protect_identity on public.marketplace_orders;
create trigger marketplace_orders_protect_identity before update on public.marketplace_orders
for each row execute function public.protect_marketplace_order_identity();

alter table public.marketplace_orders enable row level security;

drop policy if exists "marketplace_orders_read_participants" on public.marketplace_orders;
create policy "marketplace_orders_read_participants" on public.marketplace_orders
for select to authenticated using (
  customer_id = auth.uid()
  or public.is_admin()
  or merchant_phone = (select phone from public.profiles where id = auth.uid())
  or (
    (select role from public.profiles where id = auth.uid()) = 'driver'
    and status in ('ready_for_delivery', 'in_delivery', 'delivered')
    and (driver_id is null or driver_id = auth.uid())
  )
);

drop policy if exists "marketplace_orders_insert_customer" on public.marketplace_orders;
create policy "marketplace_orders_insert_customer" on public.marketplace_orders
for insert to authenticated with check (customer_id = auth.uid());

drop policy if exists "marketplace_orders_update_participants" on public.marketplace_orders;
create policy "marketplace_orders_update_participants" on public.marketplace_orders
for update to authenticated using (
  customer_id = auth.uid()
  or public.is_admin()
  or merchant_phone = (select phone from public.profiles where id = auth.uid())
  or (
    (select role from public.profiles where id = auth.uid()) = 'driver'
    and (driver_id is null or driver_id = auth.uid())
  )
) with check (
  public.is_admin()
  or merchant_phone = (select phone from public.profiles where id = auth.uid())
  or customer_id = auth.uid()
  or (
    (select role from public.profiles where id = auth.uid()) = 'driver'
    and driver_id = auth.uid()
  )
);

grant select, insert, update on public.marketplace_orders to authenticated;
grant usage, select on sequence public.marketplace_orders_id_seq to authenticated;
