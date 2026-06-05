-- Snapshots de relatório para links públicos
create table if not exists public.relatorio_links (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  empresa_nome text not null,
  titulo       text,
  subtitulo    text,
  dados        jsonb not null,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.relatorio_links enable row level security;

-- Anônimos podem LER snapshots ativos (necessário para o link público)
create policy "rel_link_anon_select" on public.relatorio_links
  for select to anon, authenticated
  using (ativo = true);

-- Consultores autenticados podem criar/desativar os seus
create policy "rel_link_write" on public.relatorio_links
  for all to authenticated
  using (
    empresa_id in (select id from public.empresas where consultor_id = auth.uid())
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  )
  with check (
    empresa_id in (select id from public.empresas where consultor_id = auth.uid())
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  );

grant select on public.relatorio_links to anon;
grant select, insert, update, delete on public.relatorio_links to authenticated;
