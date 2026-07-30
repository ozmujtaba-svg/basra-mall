create table if not exists public.marketing_banners (
  id bigint generated always as identity primary key,
  title text not null check (char_length(trim(title)) between 3 and 100),
  subtitle text not null default '' check (char_length(subtitle) <= 250),
  image_url text not null default '',
  cta_text text not null default '' check (char_length(cta_text) <= 40),
  cta_url text not null default '' check (
    cta_url = '' or cta_url ~* '^https?://'
  ),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists marketing_banners_visibility_idx
on public.marketing_banners (is_active, starts_at, ends_at);

drop trigger if exists marketing_banners_set_updated_at on public.marketing_banners;
create trigger marketing_banners_set_updated_at
before update on public.marketing_banners
for each row execute function public.set_updated_at();

alter table public.marketing_banners enable row level security;

drop policy if exists "marketing_banners_read_authenticated" on public.marketing_banners;
create policy "marketing_banners_read_authenticated" on public.marketing_banners
for select to authenticated using (true);

drop policy if exists "marketing_banners_insert_admin" on public.marketing_banners;
create policy "marketing_banners_insert_admin" on public.marketing_banners
for insert to authenticated with check (public.is_admin());

drop policy if exists "marketing_banners_update_admin" on public.marketing_banners;
create policy "marketing_banners_update_admin" on public.marketing_banners
for update to authenticated using (public.is_admin())
with check (public.is_admin());

drop policy if exists "marketing_banners_delete_admin" on public.marketing_banners;
create policy "marketing_banners_delete_admin" on public.marketing_banners
for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.marketing_banners to authenticated;
grant usage, select on sequence public.marketing_banners_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banner-images',
  'banner-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "banner_images_read" on storage.objects;
create policy "banner_images_read" on storage.objects
for select using (bucket_id = 'banner-images');

drop policy if exists "banner_images_insert_admin" on storage.objects;
create policy "banner_images_insert_admin" on storage.objects
for insert to authenticated
with check (bucket_id = 'banner-images' and public.is_admin());

drop policy if exists "banner_images_update_admin" on storage.objects;
create policy "banner_images_update_admin" on storage.objects
for update to authenticated
using (bucket_id = 'banner-images' and public.is_admin())
with check (bucket_id = 'banner-images' and public.is_admin());

drop policy if exists "banner_images_delete_admin" on storage.objects;
create policy "banner_images_delete_admin" on storage.objects
for delete to authenticated
using (bucket_id = 'banner-images' and public.is_admin());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'marketing_banners'
  ) then
    alter publication supabase_realtime add table public.marketing_banners;
  end if;
end;
$$;
