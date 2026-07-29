create table if not exists public.coupons (
  id bigint generated always as identity primary key,
  code text not null unique check (code = upper(trim(code)) and length(code) between 3 and 30),
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  minimum_order integer not null default 0 check (minimum_order >= 0),
  max_uses integer not null default 100 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

drop trigger if exists coupons_set_updated_at on public.coupons;
create trigger coupons_set_updated_at before update on public.coupons
for each row execute function public.set_updated_at();

alter table public.coupons enable row level security;

drop policy if exists "coupons_read_authenticated" on public.coupons;
create policy "coupons_read_authenticated" on public.coupons
for select to authenticated using (
  public.is_admin()
  or (is_active and expires_at > now() and used_count < max_uses)
);

drop policy if exists "coupons_insert_admin" on public.coupons;
create policy "coupons_insert_admin" on public.coupons
for insert to authenticated with check (public.is_admin());

drop policy if exists "coupons_update_admin" on public.coupons;
create policy "coupons_update_admin" on public.coupons
for update to authenticated using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on public.coupons to authenticated;
grant usage, select on sequence public.coupons_id_seq to authenticated;

alter table public.marketplace_orders
add column if not exists coupon_code text;

alter table public.marketplace_orders
add column if not exists discount_amount integer not null default 0
check (discount_amount >= 0);

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
    or new.delivery_fee is distinct from old.delivery_fee
    or new.coupon_code is distinct from old.coupon_code
    or new.discount_amount is distinct from old.discount_amount then
    raise exception 'Order identity and totals cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.create_marketplace_order_with_stock(
  p_customer_name text,
  p_customer_phone text,
  p_area text,
  p_landmark text,
  p_notes text,
  p_payment_method text,
  p_items jsonb,
  p_delivery_fee integer,
  p_coupon_code text default null
)
returns public.marketplace_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_store public.stores%rowtype;
  selected_product public.products%rowtype;
  selected_coupon public.coupons%rowtype;
  order_item jsonb;
  requested_quantity integer;
  product_price integer;
  calculated_subtotal integer := 0;
  coupon_discount integer := 0;
  normalized_items jsonb := '[]'::jsonb;
  created_order public.marketplace_orders%rowtype;
  requested_store_name text;
  normalized_coupon_code text := upper(trim(coalesce(p_coupon_code, '')));
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one product';
  end if;

  requested_store_name := trim(p_items->0->>'store');
  select * into selected_store
  from public.stores
  where name = requested_store_name and status = 'approved';

  if not found then
    raise exception 'Store is not available';
  end if;

  for order_item in select value from jsonb_array_elements(p_items)
  loop
    if trim(order_item->>'store') <> selected_store.name then
      raise exception 'Each order must contain products from one store';
    end if;

    requested_quantity := (order_item->>'quantity')::integer;
    if requested_quantity <= 0 then
      raise exception 'Product quantity must be greater than zero';
    end if;

    select * into selected_product
    from public.products
    where store_id = selected_store.id
      and name = trim(order_item->>'name')
      and is_visible = true
    for update;

    if not found then
      raise exception 'Product % is not available', order_item->>'name';
    end if;

    if selected_product.quantity < requested_quantity then
      raise exception 'Insufficient stock for product %', selected_product.name;
    end if;

    product_price := case
      when selected_product.discount_percent > 0
        and selected_product.discount_ends_at > now()
      then round(selected_product.price * (1 - selected_product.discount_percent / 100.0))
      else selected_product.price
    end;

    update public.products
    set quantity = quantity - requested_quantity
    where id = selected_product.id;

    calculated_subtotal := calculated_subtotal + product_price * requested_quantity;
    normalized_items := normalized_items || jsonb_build_array(
      jsonb_build_object(
        'id', selected_product.id,
        'name', selected_product.name,
        'store', selected_store.name,
        'price', to_char(product_price, 'FM999,999,999') || ' د.ع',
        'originalPrice', to_char(selected_product.price, 'FM999,999,999') || ' د.ع',
        'quantity', requested_quantity,
        'image', selected_product.image_url,
        'status', case
          when selected_product.quantity - requested_quantity = 0 then 'نفد'
          else 'متوفر'
        end
      )
    );
  end loop;

  if normalized_coupon_code <> '' then
    select * into selected_coupon
    from public.coupons
    where code = normalized_coupon_code
    for update;

    if not found
      or not selected_coupon.is_active
      or selected_coupon.expires_at <= now()
      or selected_coupon.used_count >= selected_coupon.max_uses then
      raise exception 'Coupon is invalid or expired';
    end if;

    if calculated_subtotal < selected_coupon.minimum_order then
      raise exception 'Order does not meet coupon minimum';
    end if;

    coupon_discount := case
      when selected_coupon.discount_type = 'percentage'
      then round(calculated_subtotal * selected_coupon.discount_value / 100.0)
      else selected_coupon.discount_value
    end;
    coupon_discount := least(coupon_discount, calculated_subtotal);

    update public.coupons
    set used_count = used_count + 1
    where id = selected_coupon.id;
  end if;

  calculated_subtotal := calculated_subtotal - coupon_discount;

  insert into public.marketplace_orders (
    customer_id, customer_name, customer_phone, merchant_phone, store_name,
    area, landmark, notes, payment_method, status, items, subtotal,
    delivery_fee, internal_note, coupon_code, discount_amount
  )
  values (
    auth.uid(), trim(p_customer_name), trim(p_customer_phone), selected_store.phone,
    selected_store.name, trim(p_area), coalesce(trim(p_landmark), ''),
    coalesce(trim(p_notes), ''),
    coalesce(nullif(trim(p_payment_method), ''), 'الدفع عند الاستلام'),
    'new', normalized_items, calculated_subtotal, greatest(p_delivery_fee, 0), '',
    nullif(normalized_coupon_code, ''), coupon_discount
  )
  returning * into created_order;

  return created_order;
end;
$$;

revoke all on function public.create_marketplace_order_with_stock(
  text, text, text, text, text, text, jsonb, integer, text
) from public;
grant execute on function public.create_marketplace_order_with_stock(
  text, text, text, text, text, text, jsonb, integer, text
) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'coupons'
  ) then
    alter publication supabase_realtime add table public.coupons;
  end if;
end;
$$;
