create table if not exists public.return_requests (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.marketplace_orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  customer_name text not null,
  store_name text not null,
  merchant_phone text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  request_type text not null check (request_type in ('exchange', 'refund')),
  reason text not null,
  customer_note text not null default '' check (length(customer_note) <= 300),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'completed')),
  merchant_response text not null default '' check (length(merchant_response) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, product_name)
);

drop trigger if exists return_requests_set_updated_at on public.return_requests;
create trigger return_requests_set_updated_at before update on public.return_requests
for each row execute function public.set_updated_at();

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

  if not found then
    raise exception 'Order not found';
  end if;

  if selected_order.customer_id <> auth.uid() then
    raise exception 'You can only request a return for your own order';
  end if;

  if selected_order.status <> 'delivered' then
    raise exception 'Only delivered orders can be returned';
  end if;

  if selected_order.updated_at < now() - interval '7 days' then
    raise exception 'Return period has expired';
  end if;

  select value into selected_item
  from jsonb_array_elements(selected_order.items)
  where value->>'name' = trim(new.product_name)
  limit 1;

  if selected_item is null then
    raise exception 'Product is not part of this order';
  end if;

  if new.quantity > (selected_item->>'quantity')::integer then
    raise exception 'Return quantity exceeds ordered quantity';
  end if;

  new.customer_id := selected_order.customer_id;
  new.customer_name := selected_order.customer_name;
  new.store_name := selected_order.store_name;
  new.merchant_phone := selected_order.merchant_phone;
  new.product_name := trim(new.product_name);
  new.reason := trim(new.reason);
  new.customer_note := trim(coalesce(new.customer_note, ''));
  new.status := 'pending';
  new.merchant_response := '';
  return new;
end;
$$;

drop trigger if exists return_requests_prepare on public.return_requests;
create trigger return_requests_prepare
before insert on public.return_requests
for each row execute function public.prepare_return_request();

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

drop trigger if exists return_requests_protect on public.return_requests;
create trigger return_requests_protect
before update on public.return_requests
for each row execute function public.protect_return_request();

alter table public.return_requests enable row level security;

drop policy if exists "return_requests_read_participants" on public.return_requests;
create policy "return_requests_read_participants" on public.return_requests
for select to authenticated using (
  customer_id = auth.uid()
  or public.is_admin()
  or merchant_phone = (select phone from public.profiles where id = auth.uid())
);

drop policy if exists "return_requests_insert_customer" on public.return_requests;
create policy "return_requests_insert_customer" on public.return_requests
for insert to authenticated with check (customer_id = auth.uid());

drop policy if exists "return_requests_update_staff" on public.return_requests;
create policy "return_requests_update_staff" on public.return_requests
for update to authenticated using (
  public.is_admin()
  or merchant_phone = (select phone from public.profiles where id = auth.uid())
) with check (
  public.is_admin()
  or merchant_phone = (select phone from public.profiles where id = auth.uid())
);

grant select, insert, update on public.return_requests to authenticated;
grant usage, select on sequence public.return_requests_id_seq to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'return_requests'
  ) then
    alter publication supabase_realtime add table public.return_requests;
  end if;
end;
$$;
