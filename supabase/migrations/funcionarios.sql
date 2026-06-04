-- Tabela de funcionários por empresa
create table if not exists public.funcionarios (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  setor_id      uuid references public.setores(id) on delete set null,
  nome          text not null,
  cargo         text,
  email         text,
  cpf           text,
  data_admissao date,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.funcionarios enable row level security;

create policy "funcionarios_owner" on public.funcionarios
  for all
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()))
  with check (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

grant select, insert, update, delete on public.funcionarios to authenticated;

create index if not exists idx_funcionarios_empresa on public.funcionarios (empresa_id);
create index if not exists idx_funcionarios_setor   on public.funcionarios (setor_id);
