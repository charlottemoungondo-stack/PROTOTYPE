-- Corpus Coach : sauvegarde en ligne des données de chaque utilisateur.
-- Chaque personne ne peut lire et écrire que ses propres lignes (Row Level Security).

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "lecture de ses données" on public.user_state
  for select using ((select auth.uid()) = user_id);
create policy "création de ses données" on public.user_state
  for insert with check ((select auth.uid()) = user_id);
create policy "mise à jour de ses données" on public.user_state
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "suppression de ses données" on public.user_state
  for delete using ((select auth.uid()) = user_id);

-- Photos avant/après : stockage privé, un dossier par utilisateur (photos/<user_id>/...).
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
  on conflict (id) do nothing;

create policy "photos : lecture des siennes" on storage.objects
  for select using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos : ajout des siennes" on storage.objects
  for insert with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos : suppression des siennes" on storage.objects
  for delete using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
