-- Adiciona flag de senha provisória em perfis
alter table public.perfis
  add column if not exists senha_provisoria boolean not null default false;
