-- Todos os consultores autenticados podem LER dados de todas as empresas
-- Escrita/exclusão continua restrita ao dono (consultor_id) ou admin

-- ── SETORES ─────────────────────────────────────────────────────────────────
drop policy if exists "setores_owner"  on public.setores;
drop policy if exists "setores_select" on public.setores;
drop policy if exists "setores_write"  on public.setores;
drop policy if exists "setores_update" on public.setores;
drop policy if exists "setores_delete" on public.setores;

create policy "setores_select" on public.setores
  for select to authenticated using (true);

create policy "setores_write" on public.setores
  for insert to authenticated
  with check (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

create policy "setores_update" on public.setores
  for update to authenticated
  using (empresa_id in (
    select id from public.empresas where consultor_id = auth.uid()
    or id in (select e.id from public.empresas e join public.perfis p on p.id = auth.uid() where p.role = 'admin')
  ));

create policy "setores_delete" on public.setores
  for delete to authenticated
  using (empresa_id in (
    select id from public.empresas where consultor_id = auth.uid()
    or id in (select e.id from public.empresas e join public.perfis p on p.id = auth.uid() where p.role = 'admin')
  ));


-- ── RISCOS ───────────────────────────────────────────────────────────────────
drop policy if exists "riscos_owner"  on public.riscos;
drop policy if exists "riscos_select" on public.riscos;
drop policy if exists "riscos_write"  on public.riscos;
create policy "riscos_select" on public.riscos
  for select to authenticated using (true);
create policy "riscos_write" on public.riscos
  for all to authenticated
  using (setor_id in (
    select s.id from public.setores s
    join public.empresas e on e.id = s.empresa_id
    where e.consultor_id = auth.uid()
  ));

-- ── DIAGNÓSTICOS ─────────────────────────────────────────────────────────────
drop policy if exists "diagnosticos_owner"  on public.diagnosticos;
drop policy if exists "diagnosticos_select" on public.diagnosticos;
drop policy if exists "diagnosticos_write"  on public.diagnosticos;
create policy "diagnosticos_select" on public.diagnosticos
  for select to authenticated using (true);
create policy "diagnosticos_write" on public.diagnosticos
  for all to authenticated
  using (setor_id in (
    select s.id from public.setores s
    join public.empresas e on e.id = s.empresa_id
    where e.consultor_id = auth.uid()
  ));

-- ── AÇÕES ────────────────────────────────────────────────────────────────────
drop policy if exists "acoes_owner"  on public.acoes;
drop policy if exists "acoes_select" on public.acoes;
drop policy if exists "acoes_write"  on public.acoes;
create policy "acoes_select" on public.acoes
  for select to authenticated using (true);
create policy "acoes_write" on public.acoes
  for all to authenticated
  using (setor_id in (
    select s.id from public.setores s
    join public.empresas e on e.id = s.empresa_id
    where e.consultor_id = auth.uid()
  ));

-- ── KPIs ─────────────────────────────────────────────────────────────────────
drop policy if exists "kpis_owner"  on public.kpis;
drop policy if exists "kpis_select" on public.kpis;
drop policy if exists "kpis_write"  on public.kpis;
create policy "kpis_select" on public.kpis
  for select to authenticated using (true);
create policy "kpis_write" on public.kpis
  for all to authenticated
  using (setor_id in (
    select s.id from public.setores s
    join public.empresas e on e.id = s.empresa_id
    where e.consultor_id = auth.uid()
  ));

-- ── OKRs ─────────────────────────────────────────────────────────────────────
drop policy if exists "okrs_owner"  on public.okrs;
drop policy if exists "okrs_select" on public.okrs;
drop policy if exists "okrs_write"  on public.okrs;
create policy "okrs_select" on public.okrs
  for select to authenticated using (true);
create policy "okrs_write" on public.okrs
  for all to authenticated
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()))
  with check (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

-- ── KEY RESULTS ──────────────────────────────────────────────────────────────
drop policy if exists "kr_owner"  on public.key_results;
drop policy if exists "kr_select" on public.key_results;
drop policy if exists "kr_write"  on public.key_results;
create policy "kr_select" on public.key_results
  for select to authenticated using (true);
create policy "kr_write" on public.key_results
  for all to authenticated
  using (okr_id in (
    select id from public.okrs where empresa_id in (
      select id from public.empresas where consultor_id = auth.uid()
    )
  ))
  with check (okr_id in (
    select id from public.okrs where empresa_id in (
      select id from public.empresas where consultor_id = auth.uid()
    )
  ));

-- ── CHECKLIST ────────────────────────────────────────────────────────────────
drop policy if exists "checklist_itens_owner" on public.checklist_itens;
drop policy if exists "checklist_select"      on public.checklist_itens;
drop policy if exists "checklist_write"       on public.checklist_itens;
create policy "checklist_select" on public.checklist_itens
  for select to authenticated using (true);
create policy "checklist_write" on public.checklist_itens
  for all to authenticated
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()))
  with check (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

-- ── FUNCIONÁRIOS ─────────────────────────────────────────────────────────────
drop policy if exists "funcionarios_owner"  on public.funcionarios;
drop policy if exists "funcionarios_select" on public.funcionarios;
drop policy if exists "funcionarios_write"  on public.funcionarios;
create policy "funcionarios_select" on public.funcionarios
  for select to authenticated using (true);
create policy "funcionarios_write" on public.funcionarios
  for all to authenticated
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()))
  with check (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

-- ── DENÚNCIAS ────────────────────────────────────────────────────────────────
drop policy if exists "denuncia_select_consultor" on public.denuncias;
drop policy if exists "denuncia_update_consultor" on public.denuncias;
drop policy if exists "denuncia_delete_consultor" on public.denuncias;
drop policy if exists "denuncias_select"          on public.denuncias;
drop policy if exists "denuncias_write"           on public.denuncias;
drop policy if exists "denuncias_delete"          on public.denuncias;
drop policy if exists "denuncia_update_consultor" on public.denuncias;
drop policy if exists "denuncia_delete_consultor" on public.denuncias;
create policy "denuncias_select" on public.denuncias
  for select to authenticated using (true);
create policy "denuncias_write" on public.denuncias
  for update to authenticated
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));
create policy "denuncias_delete" on public.denuncias
  for delete to authenticated
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));
