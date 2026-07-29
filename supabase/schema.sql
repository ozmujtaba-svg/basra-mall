create extension if not exists pgcrypto;

create type public.account_role as enum ('customer', 'merchant', 'driver', 'admin');
create type public.driver_approval_status as enum ('pending', 'approved', 'rejected');
create type public.store_status as enum ('pending', 'approved', 'rejected');
create type public.order_status as enum (
  'new',
  'preparing',
  'ready_for_delivery',
  'in_delivery',
  'delivered',
  'canceled'
);
create type public.driver_payout_status as enum ('pending', 'paid');
create type public.merchant_payout_status as enum ('pending', 'paid');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null default 'customer',
  full_name text not null,
  phone text not null unique,
  driver_status public.driver_approval_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null unique,
  category text not null,
  area text not null,
  phone text not null,
  description text not null default '',
  image_url text,
  status public.store_status not null default 'pending',
  rejection_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  price integer not null check (price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  image_url text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, name)
);

create table public.orders (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  area text not null,
  landmark text not null default '',
  notes text not null default '',
  payment_method text not null default 'cash_on_delivery',
  status public.order_status not null default 'new',
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  cancellation_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete restrict,
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0)
);

create table public.delivery_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id bigint not null unique references public.orders(id) on delete cascade,
  driver_id uuid references public.profiles(id) on delete set null,
  internal_note text not null default '',
  accepted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_settings (
  id boolean primary key default true check (id),
  commission_rate numeric(5,4) not null default 0.05 check (commission_rate between 0 and 1),
  delivery_fee integer not null default 5000 check (delivery_fee >= 0),
  delivery_fees jsonb not null default '{
    "العشار": 3000, "الجزائر": 3000, "بريهة": 3000, "البراضعية": 3000,
    "الطويسة": 3500, "الرباط": 3500, "القبلة": 4000, "الجمهورية": 4000,
    "الحيانية": 4000, "خمسة ميل": 4500, "المعقل": 4500, "الزبير": 7000,
    "أبو الخصيب": 7000, "القرنة": 10000, "المدينة": 12000, "شط العرب": 8000
  }'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.owns_store(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores
    where id = target_store_id and owner_id = auth.uid()
  );
$$;

create or replace function public.is_order_customer(target_order_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders
    where id = target_order_id and customer_id = auth.uid()
  );
$$;

create or replace function public.merchant_has_order(target_order_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items
    join public.stores on stores.id = order_items.store_id
    where order_items.order_id = target_order_id and stores.owner_id = auth.uid()
  );
$$;

create or replace function public.driver_has_order(target_order_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.delivery_tasks
    where order_id = target_order_id and driver_id = auth.uid()
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger profiles_protect_access before update on public.profiles
for each row execute function public.protect_profile_access();
create trigger stores_set_updated_at before update on public.stores
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger delivery_tasks_set_updated_at before update on public.delivery_tasks
for each row execute function public.set_updated_at();
create trigger platform_settings_set_updated_at before update on public.platform_settings
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.delivery_tasks enable row level security;
alter table public.platform_settings enable row level security;

create policy "profiles_read_own_or_admin" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (
  id = auth.uid()
  and role <> 'admin'
  and (role <> 'driver' or driver_status = 'pending')
);
create policy "profiles_update_own_or_admin" on public.profiles
for update to authenticated using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "stores_read_visible_or_owned" on public.stores
for select to authenticated using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "stores_insert_owned" on public.stores
for insert to authenticated with check (owner_id = auth.uid());
create policy "stores_update_owned_or_admin" on public.stores
for update to authenticated using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "products_read_visible" on public.products
for select to authenticated using (
  exists (
    select 1 from public.stores
    where stores.id = products.store_id
      and (stores.status = 'approved' or stores.owner_id = auth.uid() or public.is_admin())
  )
);
create policy "products_manage_by_store_owner" on public.products
for all to authenticated using (public.owns_store(store_id) or public.is_admin())
with check (public.owns_store(store_id) or public.is_admin());

create policy "orders_read_participants" on public.orders
for select to authenticated using (
  customer_id = auth.uid()
  or public.is_admin()
  or public.merchant_has_order(id)
  or public.driver_has_order(id)
);
create policy "orders_insert_customer" on public.orders
for insert to authenticated with check (customer_id = auth.uid());
create policy "orders_update_participants" on public.orders
for update to authenticated using (
  customer_id = auth.uid() or public.is_admin()
  or public.merchant_has_order(id)
  or public.driver_has_order(id)
);

create policy "order_items_read_participants" on public.order_items
for select to authenticated using (
  public.is_admin()
  or public.is_order_customer(order_id)
  or public.owns_store(store_id)
  or public.driver_has_order(order_id)
);
create policy "order_items_insert_customer" on public.order_items
for insert to authenticated with check (public.is_order_customer(order_id));

create policy "delivery_tasks_read_participants" on public.delivery_tasks
for select to authenticated using (
  driver_id = auth.uid() or public.is_admin()
  or public.is_order_customer(order_id)
  or public.merchant_has_order(order_id)
);
create policy "delivery_tasks_manage_driver_or_admin" on public.delivery_tasks
for all to authenticated using (driver_id = auth.uid() or public.is_admin())
with check (driver_id = auth.uid() or public.is_admin());

create policy "settings_read_authenticated" on public.platform_settings
for select to authenticated using (true);
create policy "settings_manage_admin" on public.platform_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles, public.stores, public.products, public.orders,
  public.order_items, public.delivery_tasks, public.platform_settings to authenticated;
grant usage, select on all sequences in schema public to authenticated;
