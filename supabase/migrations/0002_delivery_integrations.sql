alter table public.projects add column if not exists github_repo_full_name text;
alter table public.projects add column if not exists github_repo_url text;
alter table public.projects add column if not exists vercel_project_name text;
create index if not exists projects_github_repo_idx on public.projects(github_repo_full_name);