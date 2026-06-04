create table if not exists public.denuncias (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  protocolo        text not null unique,
  categoria        text not null,
  descricao        text not null,
  quando_ocorreu   text,
  frequencia       text,
  envolve_lideranca boolean default false,
  tem_testemunha   boolean default false,
  contexto         text,
  quer_contato     boolean default false,
  como_contato     text,
  status           text default 'recebida',
  observacoes_internas text,
  created_at       timestamptz not null default now()
);
alter table public.denuncias enable row level security;
create policy "denuncia_insert_anonimo" on public.denuncias
  for insert to anon, authenticated with check (true);
create policy "denuncia_select_consultor" on public.denuncias
  for select to authenticated
  using (empresa_id in (
    select id from public.empresas where consultor_id = auth.uid()
  ));
create policy "denuncia_update_consultor" on public.denuncias
  for update to authenticated
  using (empresa_id in (
    select id from public.empresas where consultor_id = auth.uid()
  ));
grant insert on public.denuncias to anon;
grant select, insert, update on public.denuncias to authenticated;
create index if not exists idx_denuncias_empresa on public.denuncias (empresa_id);
