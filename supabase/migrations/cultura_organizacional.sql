-- Módulo Cultura Organizacional

create table if not exists public.clima_pesquisas (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  configuracao  jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(empresa_id)
);

create table if not exists public.clima_respostas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  respostas   jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.nps_pesquisas (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  configuracao  jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(empresa_id)
);

create table if not exists public.nps_respostas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nota_nps    int not null check (nota_nps between 0 and 10),
  respostas   jsonb not null default '{}'::jsonb,
  comentario  text,
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.clima_pesquisas enable row level security;
alter table public.clima_respostas enable row level security;
alter table public.nps_pesquisas   enable row level security;
alter table public.nps_respostas   enable row level security;

-- clima_pesquisas: consultor das suas empresas
drop policy if exists "clima_pesquisas_owner" on public.clima_pesquisas;
create policy "clima_pesquisas_owner" on public.clima_pesquisas
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

-- clima_respostas: leitura para consultor, insert anônimo
drop policy if exists "clima_respostas_read" on public.clima_respostas;
create policy "clima_respostas_read" on public.clima_respostas
  for select using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

drop policy if exists "clima_respostas_insert" on public.clima_respostas;
create policy "clima_respostas_insert" on public.clima_respostas
  for insert with check (true);

-- nps_pesquisas: consultor das suas empresas
drop policy if exists "nps_pesquisas_owner" on public.nps_pesquisas;
create policy "nps_pesquisas_owner" on public.nps_pesquisas
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

-- nps_respostas: leitura para consultor, insert anônimo
drop policy if exists "nps_respostas_read" on public.nps_respostas;
create policy "nps_respostas_read" on public.nps_respostas
  for select using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

drop policy if exists "nps_respostas_insert" on public.nps_respostas;
create policy "nps_respostas_insert" on public.nps_respostas
  for insert with check (true);

-- Permissões explícitas para anon (submissão pública)
grant insert on public.clima_respostas to anon;
grant insert on public.nps_respostas   to anon;
grant select on public.clima_pesquisas to anon;
grant select on public.nps_pesquisas   to anon;
grant select on public.empresas        to anon;
