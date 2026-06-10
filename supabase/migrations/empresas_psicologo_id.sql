-- Permite que qualquer usuário autenticado leia perfis (necessário para o select de consultor no formulário)
drop policy if exists "perfis_authenticated_select" on public.perfis;
create policy "perfis_authenticated_select"
  on public.perfis for select
  to authenticated
  using (true);

grant select on public.perfis to authenticated;

-- Restringe SELECT de empresas: consultant só vê as suas; admin vê todas
drop policy if exists "empresas_select" on public.empresas;
create policy "empresas_select" on public.empresas
  for select to authenticated
  using (
    consultor_id = auth.uid()
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  );

-- INSERT: admin pode criar empresa para qualquer consultor; consultor só para si
drop policy if exists "empresas_insert" on public.empresas;
create policy "empresas_insert" on public.empresas
  for insert to authenticated
  with check (
    consultor_id = auth.uid()
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  );
