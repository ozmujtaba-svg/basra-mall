do $$
begin
  if not exists (select 1 from pg_type where typname = 'support_ticket_status') then
    create type public.support_ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'support_account_type') then
    create type public.support_account_type as enum ('customer', 'merchant', 'driver', 'admin');
  end if;
end;
$$;

create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id bigint references public.marketplace_orders(id) on delete set null,
  account_type public.support_account_type not null,
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 100),
  customer_phone text not null check (customer_phone ~ '^07[0-9]{9}$'),
  category text not null check (char_length(trim(category)) between 2 and 60),
  subject text not null check (char_length(trim(subject)) between 3 and 100),
  message text not null check (char_length(trim(message)) between 10 and 1000),
  admin_reply text not null default '' check (char_length(admin_reply) <= 2000),
  status public.support_ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx
on public.support_tickets (user_id, created_at desc);

create index if not exists support_tickets_status_idx
on public.support_tickets (status, created_at desc);

create or replace function public.protect_support_ticket()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.status := 'open';
    new.admin_reply := '';
    return new;
  end if;

  if not public.is_admin() then
    raise exception 'Only an administrator can update support tickets';
  end if;

  new.user_id := old.user_id;
  new.order_id := old.order_id;
  new.account_type := old.account_type;
  new.customer_name := old.customer_name;
  new.customer_phone := old.customer_phone;
  new.category := old.category;
  new.subject := old.subject;
  new.message := old.message;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists support_tickets_protect_changes on public.support_tickets;
create trigger support_tickets_protect_changes
before insert or update on public.support_tickets
for each row execute function public.protect_support_ticket();

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_select_own_or_admin" on public.support_tickets;
create policy "support_tickets_select_own_or_admin" on public.support_tickets
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own" on public.support_tickets
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "support_tickets_update_admin" on public.support_tickets;
create policy "support_tickets_update_admin" on public.support_tickets
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on public.support_tickets to authenticated;
grant usage, select on sequence public.support_tickets_id_seq to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_tickets'
  ) then
    alter publication supabase_realtime add table public.support_tickets;
  end if;
end;
$$;
