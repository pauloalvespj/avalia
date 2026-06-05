-- Libera leitura anônima para a página pública do relatório
-- (mesmo nível de acesso do questionário público)

-- Empresas: anon pode ler nome/dados básicos
drop policy if exists "empresas_select" on public.empresas;
create policy "empresas_select" on public.empresas
  for select to anon, authenticated using (true);

-- Setores
drop policy if exists "setores_select" on public.setores;
create policy "setores_select" on public.setores
  for select to anon, authenticated using (true);

-- Riscos
drop policy if exists "riscos_select" on public.riscos;
create policy "riscos_select" on public.riscos
  for select to anon, authenticated using (true);

-- Diagnósticos
drop policy if exists "diagnosticos_select" on public.diagnosticos;
create policy "diagnosticos_select" on public.diagnosticos
  for select to anon, authenticated using (true);

-- Ações
drop policy if exists "acoes_select" on public.acoes;
create policy "acoes_select" on public.acoes
  for select to anon, authenticated using (true);

-- OKRs
drop policy if exists "okrs_select" on public.okrs;
create policy "okrs_select" on public.okrs
  for select to anon, authenticated using (true);

-- Key Results
drop policy if exists "kr_select" on public.key_results;
create policy "kr_select" on public.key_results
  for select to anon, authenticated using (true);

-- KPIs
drop policy if exists "kpis_select" on public.kpis;
create policy "kpis_select" on public.kpis
  for select to anon, authenticated using (true);

-- Grants para anon
grant select on public.empresas     to anon;
grant select on public.setores      to anon;
grant select on public.riscos       to anon;
grant select on public.diagnosticos to anon;
grant select on public.acoes        to anon;
grant select on public.okrs         to anon;
grant select on public.key_results  to anon;
grant select on public.kpis         to anon;
