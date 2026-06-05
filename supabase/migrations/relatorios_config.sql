create table if not exists public.relatorios (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null unique references public.empresas(id) on delete cascade,
  titulo       text default 'Relatório de Avaliação de Riscos Psicossociais',
  subtitulo    text default 'Baseado na metodologia COPSOQ II conforme NR-01',
  metodologia  text,
  updated_at   timestamptz not null default now()
);

alter table public.relatorios enable row level security;

create policy "relatorios_select" on public.relatorios
  for select to authenticated using (true);

create policy "relatorios_write" on public.relatorios
  for all to authenticated
  using (
    empresa_id in (select id from public.empresas where consultor_id = auth.uid())
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  )
  with check (
    empresa_id in (select id from public.empresas where consultor_id = auth.uid())
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  );

grant select, insert, update, delete on public.relatorios to authenticated;
