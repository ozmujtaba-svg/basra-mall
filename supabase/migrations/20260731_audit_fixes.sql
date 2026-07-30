alter table public.marketplace_orders
add column if not exists delivered_at timestamptz;

alter table public.return_requests
add column if not exists variant_id bigint;

alter table public.return_requests
add column if not exists variant_label text not null default '';

alter table public.return_requests
drop constraint if exists return_requests_order_id_product_name_key;

create unique index if not exists return_requests_order_product_variant_key
on public.return_requests (order_id, product_name, coalesce(variant_id, 0));

update public.marketplace_orders
set delivered_at = updated_at
where status = 'delivered' and delivered_at is null;

create or replace function public.set_order_delivered_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    new.delivered_at := now();
  elsif new.delivered_at is distinct from old.delivered_at then
    new.delivered_at := old.delivered_at;
  end if;
  return new;
end;
$$;

drop trigger if exists marketplace_orders_set_delivered_at on public.marketplace_orders;
create trigger marketplace_orders_set_delivered_at
before update on public.marketplace_orders
for each row execute function public.set_order_delivered_at();

create or replace function public.prepare_return_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_order public.marketplace_orders%rowtype;
  selected_item jsonb;
begin
  select * into selected_order
  from public.marketplace_orders
  where id = new.order_id;

  if not found then raise exception 'Order not found'; end if;
  if selected_order.customer_id <> auth.uid() then
    raise exception 'You can only request a return for your own order';
  end if;
  if selected_order.status <> 'delivered' then
    raise exception 'Only delivered orders can be returned';
  end if;
  if coalesce(selected_order.delivered_at, selected_order.updated_at) < now() - interval '7 days' then
    raise exception 'Return period has expired';
  end if;

  select value into selected_item
  from jsonb_array_elements(selected_order.items)
  where value->>'name' = trim(new.product_name)
    and coalesce(value->>'variantId', '') = coalesce(new.variant_id::text, '')
  limit 1;
  if selected_item is null then raise exception 'Product is not part of this order'; end if;
  if new.quantity > (selected_item->>'quantity')::integer then
    raise exception 'Return quantity exceeds ordered quantity';
  end if;

  new.customer_id := selected_order.customer_id;
  new.customer_name := selected_order.customer_name;
  new.store_name := selected_order.store_name;
  new.merchant_phone := selected_order.merchant_phone;
  new.product_name := trim(new.product_name);
  new.variant_label := coalesce(selected_item->>'variantLabel', '');
  new.reason := trim(new.reason);
  new.customer_note := trim(coalesce(new.customer_note, ''));
  new.status := 'pending';
  new.merchant_response := '';
  return new;
end;
$$;

create or replace function public.protect_return_request()
returns trigger
language plpgsql
as $$
begin
  if new.order_id is distinct from old.order_id
    or new.customer_id is distinct from old.customer_id
    or new.store_name is distinct from old.store_name
    or new.merchant_phone is distinct from old.merchant_phone
    or new.product_name is distinct from old.product_name
    or new.variant_id is distinct from old.variant_id
    or new.variant_label is distinct from old.variant_label
    or new.quantity is distinct from old.quantity
    or new.request_type is distinct from old.request_type
    or new.reason is distinct from old.reason
    or new.customer_note is distinct from old.customer_note then
    raise exception 'Return request identity cannot be changed';
  end if;

  if not public.is_admin() then
    if old.status <> 'pending' or new.status not in ('approved', 'rejected') then
      raise exception 'Merchant can only approve or reject a pending request';
    end if;
    if trim(new.merchant_response) = '' then
      raise exception 'Merchant response is required';
    end if;
  end if;
  return new;
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

  if selected_order.coupon_code is not null then
    update public.coupons
    set used_count = greatest(used_count - 1, 0)
    where code = selected_order.coupon_code;
  end if;

  update public.marketplace_orders
  set status = 'canceled'
  where id = p_order_id
  returning * into selected_order;
  return selected_order;
end;
$$;
