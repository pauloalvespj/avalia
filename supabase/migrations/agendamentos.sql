-- Módulo de agendamentos
create table if not exists public.agendamentos (
  id             uuid primary key default gen_random_uuid(),
  consultor_id   uuid not null references auth.users(id) on delete cascade,
  empresa_id     uuid references public.empresas(id) on delete set null,
  setor_id       uuid references public.setores(id) on delete set null,
  funcionario_id uuid references public.funcionarios(id) on delete set null,
  titulo         text not null,
  tipo           text not null,
  data_hora      timestamptz not null,
  duracao        int default 60,
  modalidade     text default 'presencial',
  local_texto    text,
  link_reuniao   text,
  observacoes    text,
  status         text default 'pendente',
  created_at     timestamptz not null default now()
);

alter table public.agendamentos enable row level security;

create policy "agendamentos_owner" on public.agendamentos
  for all
  using  (consultor_id = auth.uid())
  with check (consultor_id = auth.uid());

grant select, insert, update, delete on public.agendamentos to authenticated;

create index if not exists idx_agendamentos_consultor on public.agendamentos (consultor_id);
create index if not exists idx_agendamentos_empresa   on public.agendamentos (empresa_id);
create index if not exists idx_agendamentos_data      on public.agendamentos (data_hora);
