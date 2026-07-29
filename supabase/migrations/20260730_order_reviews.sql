create table if not exists public.order_reviews (
  id bigint generated always as identity primary key,
  order_id bigint not null unique references public.marketplace_orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  store_name text not null,
  driver_id uuid references public.profiles(id) on delete set null,
  store_rating integer not null check (store_rating between 1 and 5),
  driver_rating integer not null check (driver_rating between 1 and 5),
  comment text not null default '' check (length(comment) <= 300),
  created_at timestamptz not null default now()
);

create or replace function public.prepare_order_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_order public.marketplace_orders%rowtype;
begin
  select * into selected_order
  from public.marketplace_orders
  where id = new.order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  if selected_order.customer_id <> auth.uid() then
    raise exception 'You can only review your own order';
  end if;

  if selected_order.status <> 'delivered' then
    raise exception 'Only delivered orders can be reviewed';
  end if;

  if selected_order.driver_id is null then
    raise exception 'Delivered order has no assigned driver';
  end if;

  new.customer_id := selected_order.customer_id;
  new.store_name := selected_order.store_name;
  new.driver_id := selected_order.driver_id;
  new.comment := trim(coalesce(new.comment, ''));
  return new;
end;
$$;

drop trigger if exists order_reviews_prepare on public.order_reviews;
create trigger order_reviews_prepare
before insert on public.order_reviews
for each row execute function public.prepare_order_review();

alter table public.order_reviews enable row level security;

drop policy if exists "order_reviews_read_participants" on public.order_reviews;
create policy "order_reviews_read_participants" on public.order_reviews
for select to authenticated using (
  customer_id = auth.uid()
  or driver_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.marketplace_orders order_record
    where order_record.id = order_id
      and order_record.merchant_phone = (
        select phone from public.profiles where id = auth.uid()
      )
  )
);

drop policy if exists "order_reviews_insert_customer" on public.order_reviews;
create policy "order_reviews_insert_customer" on public.order_reviews
for insert to authenticated with check (customer_id = auth.uid());

grant select, insert on public.order_reviews to authenticated;
grant usage, select on sequence public.order_reviews_id_seq to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_reviews'
  ) then
    alter publication supabase_realtime add table public.order_reviews;
  end if;
end;
$$;
