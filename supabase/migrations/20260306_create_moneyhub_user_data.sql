create table if not exists public.moneyhub_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.moneyhub_user_data enable row level security;

drop policy if exists "Users can read own moneyhub data" on public.moneyhub_user_data;
create policy "Users can read own moneyhub data"
  on public.moneyhub_user_data
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own moneyhub data" on public.moneyhub_user_data;
create policy "Users can insert own moneyhub data"
  on public.moneyhub_user_data
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own moneyhub data" on public.moneyhub_user_data;
create policy "Users can update own moneyhub data"
  on public.moneyhub_user_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own moneyhub data" on public.moneyhub_user_data;
create policy "Users can delete own moneyhub data"
  on public.moneyhub_user_data
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_moneyhub_user_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_moneyhub_user_data_updated_at on public.moneyhub_user_data;
create trigger trg_moneyhub_user_data_updated_at
before update on public.moneyhub_user_data
for each row
execute function public.set_moneyhub_user_data_updated_at();
