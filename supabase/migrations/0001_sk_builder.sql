create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  clerk_user_id text not null,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key(project_id, clerk_user_id)
);

create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  clerk_user_id text not null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.project_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','approved','executing','completed','failed')),
  architecture jsonb,
  technology jsonb,
  pages jsonb,
  components jsonb,
  database_entities jsonb,
  apis jsonb,
  security jsonb,
  testing jsonb,
  deployment jsonb,
  created_at timestamptz not null default now(),
  unique(project_id, version)
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  plan_id uuid references public.project_plans(id) on delete set null,
  task_key text not null,
  title text not null,
  description text,
  dependencies jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  priority integer not null default 100,
  status text not null default 'pending' check (status in ('pending','ready','running','passed','failed','blocked','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, task_key)
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null,
  content text,
  content_hash text,
  status text not null default 'generated' check (status in ('generated','modified','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, path)
);

create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  provider text not null check (provider in ('openai','gemini','anthropic','openrouter')),
  enabled boolean not null default true,
  model text,
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clerk_user_id, provider)
);

create table if not exists public.ai_api_keys (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  provider text not null check (provider in ('openai','gemini','anthropic','openrouter')),
  encrypted_secret text not null,
  key_fingerprint text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clerk_user_id, provider)
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  project_id uuid references public.projects(id) on delete set null,
  operation text not null,
  provider text,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(14,6),
  success boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_balances (
  clerk_user_id text primary key,
  credits numeric(14,4) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  amount numeric(14,4) not null,
  type text not null,
  operation text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  clerk_user_id text not null,
  agent_type text not null,
  status text not null default 'running' check (status in ('running','completed','failed','cancelled')),
  input jsonb,
  output jsonb,
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.build_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  clerk_user_id text not null,
  task_id uuid references public.project_tasks(id) on delete set null,
  level text not null check (level in ('info','warning','error')),
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  clerk_user_id text not null,
  provider text not null default 'vercel',
  status text not null default 'queued' check (status in ('queued','building','ready','failed','cancelled')),
  deployment_url text,
  external_id text,
  logs jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.github_connections (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  encrypted_access_token text,
  github_user_id text,
  username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vercel_connections (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  encrypted_access_token text,
  vercel_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supabase_connections (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  project_ref text not null,
  encrypted_access_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clerk_user_id, project_ref)
);

create index if not exists projects_owner_idx on public.projects(owner_clerk_user_id);
create index if not exists project_messages_project_idx on public.project_messages(project_id, created_at);
create index if not exists project_tasks_project_idx on public.project_tasks(project_id, priority);
create index if not exists project_files_project_idx on public.project_files(project_id);
create index if not exists ai_usage_user_idx on public.ai_usage(clerk_user_id, created_at);
create index if not exists build_logs_project_idx on public.build_logs(project_id, created_at);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_messages enable row level security;
alter table public.project_plans enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_files enable row level security;
alter table public.ai_providers enable row level security;
alter table public.ai_api_keys enable row level security;
alter table public.ai_usage enable row level security;
alter table public.credit_balances enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.agent_runs enable row level security;
alter table public.build_logs enable row level security;
alter table public.deployments enable row level security;
alter table public.github_connections enable row level security;
alter table public.vercel_connections enable row level security;
alter table public.supabase_connections enable row level security;

create policy "profiles owner access" on public.profiles for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "projects owner access" on public.projects for all using (owner_clerk_user_id = auth.jwt()->>'sub') with check (owner_clerk_user_id = auth.jwt()->>'sub');
create policy "project members access" on public.project_members for all using (clerk_user_id = auth.jwt()->>'sub');
create policy "messages access" on public.project_messages for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "plans access" on public.project_plans for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_clerk_user_id = auth.jwt()->>'sub')) with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_clerk_user_id = auth.jwt()->>'sub'));
create policy "tasks access" on public.project_tasks for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_clerk_user_id = auth.jwt()->>'sub')) with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_clerk_user_id = auth.jwt()->>'sub'));
create policy "files access" on public.project_files for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_clerk_user_id = auth.jwt()->>'sub')) with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_clerk_user_id = auth.jwt()->>'sub'));
create policy "providers access" on public.ai_providers for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "keys access" on public.ai_api_keys for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "usage access" on public.ai_usage for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "credits access" on public.credit_balances for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "credit tx access" on public.credit_transactions for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "agent runs access" on public.agent_runs for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "build logs access" on public.build_logs for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "deployments access" on public.deployments for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "github access" on public.github_connections for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "vercel access" on public.vercel_connections for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
create policy "supabase access" on public.supabase_connections for all using (clerk_user_id = auth.jwt()->>'sub') with check (clerk_user_id = auth.jwt()->>'sub');
