alter table public.relatorios
  add column if not exists secoes jsonb default '{}';
