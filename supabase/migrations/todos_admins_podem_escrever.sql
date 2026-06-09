-- Abre escrita para qualquer usuário autenticado em todas as tabelas
-- Não restringe por consultor_id — qualquer consultor/admin pode alterar tudo

-- ── EMPRESAS ─────────────────────────────────────────────────────────────────
drop policy if exists "empresas_insert" on public.empresas;
drop policy if exists "empresas_update" on public.empresas;
drop policy if exists "empresas_delete" on public.empresas;

create policy "empresas_insert" on public.empresas
  for insert to authenticated with check (true);

create policy "empresas_update" on public.empresas
  for update to authenticated using (true) with check (true);

create policy "empresas_delete" on public.empresas
  for delete to authenticated using (true);

-- ── SETORES ──────────────────────────────────────────────────────────────────
drop policy if exists "setores_write"  on public.setores;
drop policy if exists "setores_update" on public.setores;
drop policy if exists "setores_delete" on public.setores;

create policy "setores_write" on public.setores
  for insert to authenticated with check (true);

create policy "setores_update" on public.setores
  for update to authenticated using (true) with check (true);

create policy "setores_delete" on public.setores
  for delete to authenticated using (true);

-- ── RISCOS ───────────────────────────────────────────────────────────────────
drop policy if exists "riscos_write" on public.riscos;

create policy "riscos_write" on public.riscos
  for all to authenticated using (true) with check (true);

-- ── DIAGNÓSTICOS ─────────────────────────────────────────────────────────────
drop policy if exists "diagnosticos_write" on public.diagnosticos;

create policy "diagnosticos_write" on public.diagnosticos
  for all to authenticated using (true) with check (true);

-- ── AÇÕES ────────────────────────────────────────────────────────────────────
drop policy if exists "acoes_write" on public.acoes;

create policy "acoes_write" on public.acoes
  for all to authenticated using (true) with check (true);

-- ── KPIs ─────────────────────────────────────────────────────────────────────
drop policy if exists "kpis_write" on public.kpis;

create policy "kpis_write" on public.kpis
  for all to authenticated using (true) with check (true);

-- ── OKRs ─────────────────────────────────────────────────────────────────────
drop policy if exists "okrs_write" on public.okrs;

create policy "okrs_write" on public.okrs
  for all to authenticated using (true) with check (true);

-- ── KEY RESULTS ──────────────────────────────────────────────────────────────
drop policy if exists "kr_write" on public.key_results;

create policy "kr_write" on public.key_results
  for all to authenticated using (true) with check (true);

-- ── CHECKLIST ────────────────────────────────────────────────────────────────
drop policy if exists "checklist_write" on public.checklist_itens;

create policy "checklist_write" on public.checklist_itens
  for all to authenticated using (true) with check (true);

-- ── FUNCIONÁRIOS ─────────────────────────────────────────────────────────────
drop policy if exists "funcionarios_write" on public.funcionarios;

create policy "funcionarios_write" on public.funcionarios
  for all to authenticated using (true) with check (true);

-- ── DENÚNCIAS ────────────────────────────────────────────────────────────────
drop policy if exists "denuncias_write"  on public.denuncias;
drop policy if exists "denuncias_delete" on public.denuncias;

create policy "denuncias_write" on public.denuncias
  for update to authenticated using (true);

create policy "denuncias_delete" on public.denuncias
  for delete to authenticated using (true);

-- ── RESPOSTAS PÚBLICAS ───────────────────────────────────────────────────────
-- resp_pub_update já existe via schema.sql com using(true); nada a alterar aqui
