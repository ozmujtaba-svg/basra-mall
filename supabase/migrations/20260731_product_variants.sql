create table if not exists public.product_variants (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null default '',
  color text not null default '',
  quantity integer not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (trim(size) <> '' or trim(color) <> ''),
  unique (product_id, size, color)
);

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();

alter table public.product_variants enable row level security;

drop policy if exists "product_variants_read_authenticated" on public.product_variants;
create policy "product_variants_read_authenticated" on public.product_variants
for select to authenticated using (true);

drop policy if exists "product_variants_insert_owner" on public.product_variants;
create policy "product_variants_insert_owner" on public.product_variants
for insert to authenticated with check (
  public.is_admin()
  or exists (
    select 1
    from public.products product
    join public.stores store on store.id = product.store_id
    where product.id = product_id and store.owner_id = auth.uid()
  )
);

drop policy if exists "product_variants_update_owner" on public.product_variants;
create policy "product_variants_update_owner" on public.product_variants
for update to authenticated using (
  public.is_admin()
  or exists (
    select 1
    from public.products product
    join public.stores store on store.id = product.store_id
    where product.id = product_id and store.owner_id = auth.uid()
  )
) with check (
  public.is_admin()
  or exists (
    select 1
    from public.products product
    join public.stores store on store.id = product.store_id
    where product.id = product_id and store.owner_id = auth.uid()
  )
);

drop policy if exists "product_variants_delete_owner" on public.product_variants;
create policy "product_variants_delete_owner" on public.product_variants
for delete to authenticated using (
  public.is_admin()
  or exists (
    select 1
    from public.products product
    join public.stores store on store.id = product.store_id
    where product.id = product_id and store.owner_id = auth.uid()
  )
);

grant select, insert, update, delete on public.product_variants to authenticated;
grant usage, select on sequence public.product_variants_id_seq to authenticated;

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
  selected_variant public.product_variants%rowtype;
  selected_coupon public.coupons%rowtype;
  order_item jsonb;
  requested_quantity integer;
  requested_variant_id bigint;
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
  select * into selected_store from public.stores
  where name = requested_store_name and status = 'approved';
  if not found then raise exception 'Store is not available'; end if;

  for order_item in select value from jsonb_array_elements(p_items)
  loop
    if trim(order_item->>'store') <> selected_store.name then
      raise exception 'Each order must contain products from one store';
    end if;
    requested_quantity := (order_item->>'quantity')::integer;
    if requested_quantity <= 0 then raise exception 'Product quantity must be greater than zero'; end if;

    select * into selected_product from public.products
    where store_id = selected_store.id
      and name = trim(order_item->>'name')
      and is_visible = true
    for update;
    if not found then raise exception 'Product % is not available', order_item->>'name'; end if;

    requested_variant_id := nullif(order_item->>'variantId', '')::bigint;
    if exists (select 1 from public.product_variants where product_id = selected_product.id) then
      if requested_variant_id is null then raise exception 'Product option is required'; end if;
      select * into selected_variant from public.product_variants
      where id = requested_variant_id and product_id = selected_product.id
      for update;
      if not found then raise exception 'Product option is not available'; end if;
      if selected_variant.quantity < requested_quantity then raise exception 'Insufficient option stock'; end if;
      update public.product_variants
      set quantity = quantity - requested_quantity
      where id = selected_variant.id;
    elsif selected_product.quantity < requested_quantity then
      raise exception 'Insufficient stock for product %', selected_product.name;
    end if;

    update public.products
    set quantity = quantity - requested_quantity
    where id = selected_product.id;

    product_price := case
      when selected_product.discount_percent > 0 and selected_product.discount_ends_at > now()
      then round(selected_product.price * (1 - selected_product.discount_percent / 100.0))
      else selected_product.price
    end;
    calculated_subtotal := calculated_subtotal + product_price * requested_quantity;
    normalized_items := normalized_items || jsonb_build_array(
      jsonb_build_object(
        'id', selected_product.id,
        'name', selected_product.name,
        'store', selected_store.name,
        'price', to_char(product_price, 'FM999,999,999') || ' د.ع',
        'quantity', requested_quantity,
        'image', selected_product.image_url,
        'variantId', requested_variant_id,
        'variantLabel', case
          when requested_variant_id is null then ''
          else concat_ws(' / ', nullif(selected_variant.size, ''), nullif(selected_variant.color, ''))
        end,
        'size', case when requested_variant_id is null then '' else selected_variant.size end,
        'color', case when requested_variant_id is null then '' else selected_variant.color end,
        'status', case when selected_product.quantity - requested_quantity = 0 then 'نفد' else 'متوفر' end
      )
    );
  end loop;

  if normalized_coupon_code <> '' then
    select * into selected_coupon from public.coupons where code = normalized_coupon_code for update;
    if not found or not selected_coupon.is_active or selected_coupon.expires_at <= now()
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
    update public.coupons set used_count = used_count + 1 where id = selected_coupon.id;
  end if;

  calculated_subtotal := calculated_subtotal - coupon_discount;
  insert into public.marketplace_orders (
    customer_id, customer_name, customer_phone, merchant_phone, store_name,
    area, landmark, notes, payment_method, status, items, subtotal,
    delivery_fee, internal_note, coupon_code, discount_amount
  ) values (
    auth.uid(), trim(p_customer_name), trim(p_customer_phone), selected_store.phone,
    selected_store.name, trim(p_area), coalesce(trim(p_landmark), ''),
    coalesce(trim(p_notes), ''),
    coalesce(nullif(trim(p_payment_method), ''), 'الدفع عند الاستلام'),
    'new', normalized_items, calculated_subtotal, greatest(p_delivery_fee, 0), '',
    nullif(normalized_coupon_code, ''), coupon_discount
  ) returning * into created_order;
  return created_order;
end;
$$;

create or replace function public.cancel_marketplace_order_with_stock(p_order_id bigint)
returns public.marketplace_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_order public.marketplace_orders%rowtype;
  order_item jsonb;
  selected_store_id uuid;
  restored_variant_id bigint;
begin
  select * into selected_order
  from public.marketplace_orders
  where id = p_order_id
  for update;

  if not found then raise exception 'Order not found'; end if;
  if not (
    selected_order.customer_id = auth.uid()
    or public.is_admin()
    or selected_order.merchant_phone = (select phone from public.profiles where id = auth.uid())
  ) then
    raise exception 'You cannot cancel this order';
  end if;
  if selected_order.status = 'canceled' then return selected_order; end if;
  if selected_order.status in ('in_delivery', 'delivered') then
    raise exception 'This order can no longer be canceled';
  end if;

  select id into selected_store_id from public.stores where name = selected_order.store_name;
  for order_item in select value from jsonb_array_elements(selected_order.items)
  loop
    update public.products
    set quantity = quantity + (order_item->>'quantity')::integer
    where store_id = selected_store_id and name = order_item->>'name';

    restored_variant_id := nullif(order_item->>'variantId', '')::bigint;
    if restored_variant_id is not null then
      update public.product_variants
      set quantity = quantity + (order_item->>'quantity')::integer
      where id = restored_variant_id;
    end if;
  end loop;

  update public.marketplace_orders
  set status = 'canceled'
  where id = p_order_id
  returning * into selected_order;
  return selected_order;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'product_variants'
  ) then
    alter publication supabase_realtime add table public.product_variants;
  end if;
end;
$$;
