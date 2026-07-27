create or replace function public.create_marketplace_order_with_stock(
  p_customer_name text,
  p_customer_phone text,
  p_area text,
  p_landmark text,
  p_notes text,
  p_payment_method text,
  p_items jsonb,
  p_delivery_fee integer
)
returns public.marketplace_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_store public.stores%rowtype;
  selected_product public.products%rowtype;
  order_item jsonb;
  requested_quantity integer;
  calculated_subtotal integer := 0;
  normalized_items jsonb := '[]'::jsonb;
  created_order public.marketplace_orders%rowtype;
  requested_store_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one product';
  end if;

  requested_store_name := trim(p_items->0->>'store');
  select *
  into selected_store
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

    select *
    into selected_product
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

    update public.products
    set quantity = quantity - requested_quantity
    where id = selected_product.id;

    calculated_subtotal := calculated_subtotal + selected_product.price * requested_quantity;
    normalized_items := normalized_items || jsonb_build_array(
      jsonb_build_object(
        'id', selected_product.id,
        'name', selected_product.name,
        'store', selected_store.name,
        'price', to_char(selected_product.price, 'FM999,999,999') || ' د.ع',
        'quantity', requested_quantity,
        'image', selected_product.image_url,
        'status', case
          when selected_product.quantity - requested_quantity = 0 then 'نفد'
          else 'متوفر'
        end
      )
    );
  end loop;

  insert into public.marketplace_orders (
    customer_id,
    customer_name,
    customer_phone,
    merchant_phone,
    store_name,
    area,
    landmark,
    notes,
    payment_method,
    status,
    items,
    subtotal,
    delivery_fee,
    internal_note
  )
  values (
    auth.uid(),
    trim(p_customer_name),
    trim(p_customer_phone),
    selected_store.phone,
    selected_store.name,
    trim(p_area),
    coalesce(trim(p_landmark), ''),
    coalesce(trim(p_notes), ''),
    coalesce(nullif(trim(p_payment_method), ''), 'الدفع عند الاستلام'),
    'new',
    normalized_items,
    calculated_subtotal,
    greatest(p_delivery_fee, 0),
    ''
  )
  returning * into created_order;

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
begin
  select *
  into selected_order
  from public.marketplace_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if not (
    selected_order.customer_id = auth.uid()
    or public.is_admin()
    or selected_order.merchant_phone = (
      select phone from public.profiles where id = auth.uid()
    )
  ) then
    raise exception 'You cannot cancel this order';
  end if;

  if selected_order.status = 'canceled' then
    return selected_order;
  end if;

  if selected_order.status in ('in_delivery', 'delivered') then
    raise exception 'This order can no longer be canceled';
  end if;

  select id into selected_store_id
  from public.stores
  where name = selected_order.store_name;

  for order_item in select value from jsonb_array_elements(selected_order.items)
  loop
    update public.products
    set quantity = quantity + (order_item->>'quantity')::integer
    where store_id = selected_store_id
      and name = order_item->>'name';
  end loop;

  update public.marketplace_orders
  set status = 'canceled'
  where id = p_order_id
  returning * into selected_order;

  return selected_order;
end;
$$;

revoke all on function public.create_marketplace_order_with_stock(
  text, text, text, text, text, text, jsonb, integer
) from public;
grant execute on function public.create_marketplace_order_with_stock(
  text, text, text, text, text, text, jsonb, integer
) to authenticated;

revoke all on function public.cancel_marketplace_order_with_stock(bigint) from public;
grant execute on function public.cancel_marketplace_order_with_stock(bigint) to authenticated;
