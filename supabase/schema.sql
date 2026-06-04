-- ============================================================
-- P.S.I. Guard — Esquema relacional (Supabase / PostgreSQL)
-- ============================================================
-- Cole TUDO no SQL Editor do Supabase e clique em Run.
-- ============================================================

-- ============================================================
-- TABELAS PRINCIPAIS
-- ============================================================

-- Empresas (cada consultor tem as suas)
create table if not exists public.empresas (
  id            uuid primary key default gen_random_uuid(),
  consultor_id  uuid not null references auth.users(id) on delete cascade,
  nome          text not null,
  cnpj          text,
  setor_ramo    text,
  func_total    int default 0,
  data_inicio   date,
  responsavel   text,
  contato       text,
  demanda       text,
  historico     text,
  turnover      text,
  atestados     text,
  rh            text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Setores de cada empresa
create table if not exists public.setores (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nome        text not null,
  func_setor  int default 0,
  created_at  timestamptz not null default now()
);

-- Respostas públicas enviadas pelos funcionários (anônimas)
create table if not exists public.respostas_publicas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid references public.empresas(id) on delete set null,
  setor_id    uuid references public.setores(id) on delete set null,
  respostas   jsonb not null,   -- { q1: 3, q2: 5, ... }
  importada   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Respostas já importadas para o setor (cópia local para cálculos)
create table if not exists public.respostas (
  id                  uuid primary key default gen_random_uuid(),
  setor_id            uuid not null references public.setores(id) on delete cascade,
  resposta_publica_id uuid references public.respostas_publicas(id) on delete set null,
  respostas           jsonb not null,
  created_at          timestamptz not null default now()
);

-- Riscos calculados por setor
create table if not exists public.riscos (
  id          uuid primary key default gen_random_uuid(),
  setor_id    uuid not null references public.setores(id) on delete cascade,
  fator       text not null,        -- ex: 'Exigências do trabalho'
  subfator    text,
  score       numeric(5,2),
  nivel       text,                 -- 'baixo' | 'medio' | 'alto' | 'critico'
  evidencias  text,
  updated_at  timestamptz not null default now()
);

-- Diagnóstico final por setor
create table if not exists public.diagnosticos (
  id               uuid primary key default gen_random_uuid(),
  setor_id         uuid not null unique references public.setores(id) on delete cascade,
  sintese          text,
  riscos_txt       text,
  protetores       text,
  recomendacoes    text,
  conclusao        text,
  updated_at       timestamptz not null default now()
);

-- Plano de ação
create table if not exists public.acoes (
  id            uuid primary key default gen_random_uuid(),
  setor_id      uuid not null references public.setores(id) on delete cascade,
  consultor_id  uuid not null references auth.users(id) on delete cascade,
  descricao     text not null,
  responsavel   text,
  prazo         date,
  prioridade    text default 'media',  -- 'baixa' | 'media' | 'alta' | 'critica'
  status        text default 'aberta', -- 'aberta' | 'em_andamento' | 'concluida'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- OKRs
create table if not exists public.okrs (
  id          uuid primary key default gen_random_uuid(),
  setor_id    uuid not null references public.setores(id) on delete cascade,
  objetivo    text not null,
  prazo       date,
  created_at  timestamptz not null default now()
);

-- Key Results dos OKRs
create table if not exists public.key_results (
  id          uuid primary key default gen_random_uuid(),
  okr_id      uuid not null references public.okrs(id) on delete cascade,
  texto       text not null,
  progresso   int default 0 check (progresso between 0 and 100)
);

-- KPIs
create table if not exists public.kpis (
  id          uuid primary key default gen_random_uuid(),
  setor_id    uuid not null references public.setores(id) on delete cascade,
  nome        text not null,
  baseline    text,
  atual       text,
  meta        text,
  updated_at  timestamptz not null default now()
);

-- Checklist do projeto
create table if not exists public.checklist_itens (
  id          uuid primary key default gen_random_uuid(),
  setor_id    uuid not null references public.setores(id) on delete cascade,
  texto       text not null,
  concluido   boolean not null default false,
  ordem       int default 0,
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_empresas_consultor   on public.empresas (consultor_id);
create index if not exists idx_setores_empresa      on public.setores (empresa_id);
create index if not exists idx_respostas_setor      on public.respostas (setor_id);
create index if not exists idx_respostas_pub_setor  on public.respostas_publicas (setor_id);
create index if not exists idx_riscos_setor         on public.riscos (setor_id);
create index if not exists idx_acoes_setor          on public.acoes (setor_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.empresas         enable row level security;
alter table public.setores          enable row level security;
alter table public.respostas        enable row level security;
alter table public.respostas_publicas enable row level security;
alter table public.riscos           enable row level security;
alter table public.diagnosticos     enable row level security;
alter table public.acoes            enable row level security;
alter table public.okrs             enable row level security;
alter table public.key_results      enable row level security;
alter table public.kpis             enable row level security;
alter table public.checklist_itens  enable row level security;

-- Empresas: consultor vê e manipula só as suas
create policy "empresas_owner" on public.empresas
  using (auth.uid() = consultor_id) with check (auth.uid() = consultor_id);

-- Setores: consultor acessa setores das suas empresas
create policy "setores_owner" on public.setores
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

-- Respostas importadas: acesso via setor → empresa → consultor
create policy "respostas_owner" on public.respostas
  using (setor_id in (
    select s.id from public.setores s
    join public.empresas e on e.id = s.empresa_id
    where e.consultor_id = auth.uid()
  ));

-- Respostas públicas: anônimos INSERT, autenticados SELECT+UPDATE
create policy "resp_pub_insert"  on public.respostas_publicas for insert to anon, authenticated with check (true);
create policy "resp_pub_select"  on public.respostas_publicas for select  to authenticated using (true);
create policy "resp_pub_update"  on public.respostas_publicas for update  to authenticated using (true);

-- Demais tabelas: acesso via cadeia setor → empresa → consultor
do $$
declare
  t text;
begin
  foreach t in array array['riscos','diagnosticos','acoes','okrs','kpis','checklist_itens']
  loop
    execute format($f$
      create policy "%s_owner" on public.%s
        using (setor_id in (
          select s.id from public.setores s
          join public.empresas e on e.id = s.empresa_id
          where e.consultor_id = auth.uid()
        ));
    $f$, t, t);
  end loop;
end$$;

-- key_results: via okr → setor → empresa → consultor
create policy "kr_owner" on public.key_results
  using (okr_id in (
    select o.id from public.okrs o
    join public.setores s on s.id = o.setor_id
    join public.empresas e on e.id = s.empresa_id
    where e.consultor_id = auth.uid()
  ));

-- ============================================================
-- GRANTS (necessário em projetos criados após 30/05/2026)
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.empresas         to authenticated;
grant select, insert, update, delete on public.setores          to authenticated;
grant select, insert, update, delete on public.respostas        to authenticated;
grant select, insert, update, delete on public.riscos           to authenticated;
grant select, insert, update, delete on public.diagnosticos     to authenticated;
grant select, insert, update, delete on public.acoes            to authenticated;
grant select, insert, update, delete on public.okrs             to authenticated;
grant select, insert, update, delete on public.key_results      to authenticated;
grant select, insert, update, delete on public.kpis             to authenticated;
grant select, insert, update, delete on public.checklist_itens  to authenticated;
grant insert                          on public.respostas_publicas to anon;
grant select, insert, update          on public.respostas_publicas to authenticated;

-- ============================================================
-- KPIs padrão (inseridos automaticamente ao criar setor)
-- Deixe comentado por agora; implemente via trigger se quiser.
-- ============================================================
-- create or replace function public.seed_kpis_padrao()
-- returns trigger language plpgsql security definer as $$
-- begin
--   insert into public.kpis (setor_id, nome, meta) values
--     (new.id, 'Taxa de rotatividade (%)', ''),
--     (new.id, 'Absenteísmo (dias/mês)', ''),
--     (new.id, 'Atestados emitidos (qtd)', ''),
--     (new.id, 'Score médio de burnout', ''),
--     (new.id, 'eNPS (satisfação)', ''),
--     (new.id, 'Ações implementadas (%)', '80');
--   return new;
-- end$$;
-- create trigger trg_seed_kpis after insert on public.setores
--   for each row execute function public.seed_kpis_padrao();
