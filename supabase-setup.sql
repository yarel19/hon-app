create table if not exists public.hon_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.hon_data enable row level security;

create policy "Users read their own HON data"
on public.hon_data for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create their own HON data"
on public.hon_data for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own HON data"
on public.hon_data for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
