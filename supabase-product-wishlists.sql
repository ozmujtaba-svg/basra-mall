create table if not exists public.product_wishlists (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists product_wishlists_product_id_idx
on public.product_wishlists (product_id);

create index if not exists product_wishlists_user_id_idx
on public.product_wishlists (user_id, created_at desc);

alter table public.product_wishlists enable row level security;

drop policy if exists "product_wishlists_select_own_or_admin" on public.product_wishlists;
create policy "product_wishlists_select_own_or_admin" on public.product_wishlists
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "product_wishlists_insert_own" on public.product_wishlists;
create policy "product_wishlists_insert_own" on public.product_wishlists
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "product_wishlists_delete_own_or_admin" on public.product_wishlists;
create policy "product_wishlists_delete_own_or_admin" on public.product_wishlists
for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

grant select, insert, delete on public.product_wishlists to authenticated;
grant usage, select on sequence public.product_wishlists_id_seq to authenticated;

alter table public.products replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'product_wishlists'
  ) then
    alter publication supabase_realtime add table public.product_wishlists;
  end if;
end;
$$;
