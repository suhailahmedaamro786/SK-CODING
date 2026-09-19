-- Idempotent production repair for installations where the initial migration
-- was skipped, partially applied, or PostgREST has a stale schema cache.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_clerk_user_id text not null,
  name text not null,
  slug text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','planning','building','ready','failed','archived')),
  specification jsonb,
  architecture jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_clerk_user_id, slug)
);

alter table public.projects add column if not exists owner_clerk_user_id text;
alter table public.projects add column if not exists name text;
alter table public.projects add column if not exists slug text;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists status text default 'draft';
alter table public.projects add column if not exists specification jsonb;
alter table public.projects add column if not exists architecture jsonb;
alter table public.projects add column if not exists created_at timestamptz default now();
alter table public.projects add column if not exists updated_at timestamptz default now();

create index if not exists projects_owner_idx on public.projects(owner_clerk_user_id);

alter table public.projects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='projects' and policyname='projects owner access'
  ) then
    create policy "projects owner access" on public.projects
      for all
      using (owner_clerk_user_id = auth.jwt()->>'sub')
      with check (owner_clerk_user_id = auth.jwt()->>'sub');
  end if;
end $$;

notify pgrst, 'reload schema';
