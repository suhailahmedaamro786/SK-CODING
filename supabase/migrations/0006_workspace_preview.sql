alter table public.projects add column if not exists preview_html text;
notify pgrst, 'reload schema';
