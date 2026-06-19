-- =============================================================================
-- P.S.I. Guard — Tabelas que faltam
-- Execute no SQL Editor do Supabase (Project → SQL Editor → New Query → Run All)
-- Seguro para rodar mais de uma vez (idempotente).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PERFIS DE ACESSO (RBAC)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.perfis_acesso (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  permissoes  jsonb not null default '{}'::jsonb,
  criado_em   timestamptz not null default now()
);

-- Caso a tabela já exista sem a coluna descricao:
alter table public.perfis_acesso
  add column if not exists descricao text;

alter table public.perfis_acesso enable row level security;

drop policy if exists "perfis_acesso_admin"               on public.perfis_acesso;
drop policy if exists "perfis_acesso_leitura_autenticado" on public.perfis_acesso;

create policy "perfis_acesso_admin"
  on public.perfis_acesso for all
  using (public.minha_role() = 'admin')
  with check (public.minha_role() = 'admin');

create policy "perfis_acesso_leitura_autenticado"
  on public.perfis_acesso for select
  to authenticated
  using (true);

grant select, insert, update, delete on public.perfis_acesso to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. COLUNA perfil_acesso_id NA TABELA perfis
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.perfis
  add column if not exists perfil_acesso_id uuid references public.perfis_acesso(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CAMPOS TELEFONE / EMAIL / STATUS_LEAD NA TABELA EMPRESAS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.empresas
  add column if not exists telefone    text,
  add column if not exists email       text,
  add column if not exists status_lead text default 'ativo';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FUNCIONÁRIOS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.funcionarios (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas(id) on delete cascade,
  setor_id       uuid references public.setores(id) on delete set null,
  nome           text not null,
  cargo          text,
  email          text,
  cpf            text,
  data_admissao  date,
  ativo          boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table public.funcionarios enable row level security;

drop policy if exists "funcionarios_owner" on public.funcionarios;
create policy "funcionarios_owner" on public.funcionarios
  for all
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()))
  with check (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

grant select, insert, update, delete on public.funcionarios to authenticated;

create index if not exists idx_funcionarios_empresa on public.funcionarios (empresa_id);
create index if not exists idx_funcionarios_setor   on public.funcionarios (setor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. AGENDAMENTOS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.agendamentos (
  id                   uuid primary key default gen_random_uuid(),
  consultor_id         uuid not null references auth.users(id) on delete cascade,
  empresa_id           uuid references public.empresas(id) on delete set null,
  setor_id             uuid references public.setores(id) on delete set null,
  funcionario_id       uuid references public.funcionarios(id) on delete set null,
  titulo               text not null,
  tipo                 text,
  data_hora            timestamptz,
  duracao              int,
  modalidade           text default 'presencial',
  local_texto          text,
  link_reuniao         text,
  observacoes          text,
  laudo                text,
  status               text default 'agendado',
  contabiliza_credito  boolean default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.agendamentos enable row level security;

drop policy if exists "agendamentos_owner" on public.agendamentos;
create policy "agendamentos_owner" on public.agendamentos
  for all
  using (consultor_id = auth.uid())
  with check (consultor_id = auth.uid());

grant select, insert, update, delete on public.agendamentos to authenticated;

create index if not exists idx_agendamentos_consultor on public.agendamentos (consultor_id);
create index if not exists idx_agendamentos_empresa   on public.agendamentos (empresa_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ESCUTA DA EQUIPE
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.escutas_equipe (
  id                 uuid primary key default gen_random_uuid(),
  setor_id           uuid not null references public.setores(id) on delete cascade,
  consultor_id       uuid not null references auth.users(id) on delete cascade,
  data_entrevista    date,
  num_participantes  int,
  sintese_geral      text,
  observacoes        text,
  created_at         timestamptz not null default now()
);

alter table public.escutas_equipe enable row level security;

drop policy if exists "escutas_equipe_owner" on public.escutas_equipe;
create policy "escutas_equipe_owner" on public.escutas_equipe
  for all
  using (setor_id in (
    select s.id from public.setores s
    join public.empresas e on e.id = s.empresa_id
    where e.consultor_id = auth.uid()
  ))
  with check (consultor_id = auth.uid());

grant select, insert, update, delete on public.escutas_equipe to authenticated;

create index if not exists idx_escutas_equipe_setor on public.escutas_equipe (setor_id);

create table if not exists public.escutas_equipe_eixos (
  id          uuid primary key default gen_random_uuid(),
  escuta_id   uuid not null references public.escutas_equipe(id) on delete cascade,
  eixo_key    text not null,
  sintese     text,
  atencao     text,
  unique (escuta_id, eixo_key)
);

alter table public.escutas_equipe_eixos enable row level security;

drop policy if exists "escutas_eixos_owner" on public.escutas_equipe_eixos;
create policy "escutas_eixos_owner" on public.escutas_equipe_eixos
  for all
  using (escuta_id in (
    select e.id from public.escutas_equipe e
    join public.setores s on s.id = e.setor_id
    join public.empresas em on em.id = s.empresa_id
    where em.consultor_id = auth.uid()
  ));

grant select, insert, update, delete on public.escutas_equipe_eixos to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ESCUTA DOS GESTORES
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.entrevistas_gestores (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  consultor_id     uuid not null references auth.users(id) on delete cascade,
  data_entrevista  date not null,
  nome_gestor      text not null,
  cargo            text,
  created_at       timestamptz not null default now()
);

alter table public.entrevistas_gestores enable row level security;

drop policy if exists "entrevistas_gestores_owner" on public.entrevistas_gestores;
create policy "entrevistas_gestores_owner" on public.entrevistas_gestores
  for all
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()))
  with check (consultor_id = auth.uid());

grant select, insert, update, delete on public.entrevistas_gestores to authenticated;

create index if not exists idx_entrevistas_gestores_empresa on public.entrevistas_gestores (empresa_id);

create table if not exists public.entrevistas_gestores_blocos (
  id             uuid primary key default gen_random_uuid(),
  entrevista_id  uuid not null references public.entrevistas_gestores(id) on delete cascade,
  bloco_num      int not null,
  texto          text,
  unique (entrevista_id, bloco_num)
);

alter table public.entrevistas_gestores_blocos enable row level security;

drop policy if exists "entrevistas_blocos_owner" on public.entrevistas_gestores_blocos;
create policy "entrevistas_blocos_owner" on public.entrevistas_gestores_blocos
  for all
  using (entrevista_id in (
    select eg.id from public.entrevistas_gestores eg
    join public.empresas e on e.id = eg.empresa_id
    where e.consultor_id = auth.uid()
  ));

grant select, insert, update, delete on public.entrevistas_gestores_blocos to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. PERFIS — grants e policies extras para admin gerenciar usuários
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "perfis_admin_insert" on public.perfis;
create policy "perfis_admin_insert"
  on public.perfis for insert
  with check (public.minha_role() = 'admin');

grant select, insert, update, delete on public.perfis to authenticated;
